from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, Form, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging
import os
from pathlib import Path
import shutil
import zipfile
import tempfile

from database import get_db, init_db
from models import User, Role, Opportunity, Artifact, OpportunityArtifactMapping, OpportunityCollaborator, AuditLog
from schemas import (
    LoginRequest, TokenResponse, UserResponse, OpportunityCreate,
    OpportunityUpdate, OpportunityResponse, ArtifactCreate, ArtifactResponse,
    MappingCreate, MappingResponse, AuditLogResponse, HealthResponse, AIRecommendationResponse
)
from auth import create_access_token, get_current_user, get_current_user_optional, verify_password, hash_password
from services.bedrock_service import bedrock_service
from services.vector_db_service import vector_db_service
from services.document_parser import document_parser
from seed import seed_database

app = FastAPI(title="Presales Platform API")

logger = logging.getLogger(__name__)

# Create upload directory for artifacts
UPLOAD_DIR = Path("artifacts_storage")
UPLOAD_DIR.mkdir(exist_ok=True)

# CORS configuration - must be first
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# Lifecycle events
@app.on_event("startup")
async def startup():
    try:
        init_db()
        seed_database()
        logger.info("Database initialized and seeded")
    except Exception as e:
        logger.error(f"Startup error: {e}")


# Health endpoints
@app.get("/api/health", response_model=dict)
async def health_check():
    return {"status": "healthy"}


@app.get("/api/health/ai", response_model=HealthResponse)
async def ai_health_check():
    return bedrock_service.get_health_status()


# Auth endpoints
@app.options("/api/auth/login")
async def login_options():
    return {}


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Demo users for testing
    DEMO_USERS = {
        "priya.sharma@example.com": {"id": 1, "name": "Priya Sharma", "role": "Presales Solution Owner"},
        "amit.kulkarni@example.com": {"id": 2, "name": "Amit Kulkarni", "role": "Presales Solution Member"},
        "rahul.mehta@example.com": {"id": 3, "name": "Rahul Mehta", "role": "Artifact Repository Owner"},
        "sneha.patil@example.com": {"id": 4, "name": "Sneha Patil", "role": "Guest/Reviewer"},
        "neha.joshi@example.com": {"id": 5, "name": "Neha Joshi", "role": "Management"},
        "arjun.desai@example.com": {"id": 6, "name": "Arjun Desai", "role": "Sales Owner"},
        "vikram.shah@example.com": {"id": 7, "name": "Vikram Shah", "role": "Presales Administrator"},
        "ananya.rao@example.com": {"id": 8, "name": "Ananya Rao", "role": "Presales Administrator"},
    }

    if request.password != "Demo@123":
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if request.email not in DEMO_USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    demo_user = DEMO_USERS[request.email]
    access_token = create_access_token(data={"sub": str(demo_user["id"])})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": demo_user["id"],
        "user_name": demo_user["name"],
        "role": demo_user["role"]
    }


# Users endpoints
@app.get("/api/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users


@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


# Helper function to enrich opportunity with user names
def enrich_opportunity(opp: Opportunity) -> dict:
    """Add owner_name and assigned_to_name to opportunity response"""
    opp_dict = {
        'id': opp.id,
        'opportunity_id': opp.opportunity_id,
        'name': opp.name,
        'customer': opp.customer,
        'industry': opp.industry,
        'region': opp.region,
        'description': opp.description,
        'business_problem': opp.business_problem,
        'requirements': opp.requirements,
        'proposed_solution': opp.proposed_solution,
        'estimated_value': opp.estimated_value,
        'stage': opp.stage,
        'probability': opp.probability,
        'priority': opp.priority,
        'owner_id': opp.owner_id,
        'assigned_to_id': opp.assigned_to_id,
        'status': opp.status,
        'created_at': opp.created_at,
        'updated_at': opp.updated_at,
        'technologies': opp.technologies,
        'owner_name': None,
        'assigned_to_name': None,
    }

    # Add owner name
    if opp.owner:
        opp_dict['owner_name'] = f"{opp.owner.first_name} {opp.owner.last_name}".strip()

    # Add assigned_to name
    if opp.assigned_to:
        opp_dict['assigned_to_name'] = f"{opp.assigned_to.first_name} {opp.assigned_to.last_name}".strip()

    return opp_dict


# Opportunities endpoints
@app.get("/api/opportunities", response_model=List[OpportunityResponse])
async def list_opportunities(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    skip: int = Query(0),
    limit: int = Query(50),
    stage: Optional[str] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[int] = Query(None)
):
    # Unauthenticated users cannot see any opportunities
    if not current_user or not current_user.role_id:
        return []

    query = db.query(Opportunity)
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    role_name = user_role.name if user_role else None

    # Role-based filtering
    if role_name == "Presales Administrator":
        # Can see opportunities assigned to them AND opportunities they assigned to others
        query = query.filter(
            or_(
                Opportunity.assigned_to_id == current_user.id,
                Opportunity.assigned_by_id == current_user.id
            )
        )
    elif role_name == "Presales Solution Owner":
        # Can see opportunities assigned to them AND opportunities they assigned to others
        # But not if they've already completed it (unless they need to see member_completed status)
        query = query.filter(
            or_(
                Opportunity.assigned_to_id == current_user.id,
                Opportunity.assigned_by_id == current_user.id
            )
        ).filter(Opportunity.completion_status != "owner_completed")
    elif role_name == "Presales Solution Member":
        # Can see opportunities assigned to them OR where they are collaborators
        # But not if they've already completed it
        query = query.filter(
            or_(
                Opportunity.assigned_to_id == current_user.id,
                Opportunity.collaborators.any(OpportunityCollaborator.user_id == current_user.id)
            )
        ).filter(Opportunity.completion_status != "member_completed")
    elif role_name == "Sales Owner":
        # Sees the opportunities they created, assigned or not
        query = query.filter(Opportunity.owner_id == current_user.id)
    else:
        # Other roles cannot see any opportunities
        return []

    # Filter out archived opportunities unless searching
    if search:
        # When searching, include archived opportunities
        query = query.filter(
            (Opportunity.name.ilike(f"%{search}%")) |
            (Opportunity.customer.ilike(f"%{search}%"))
        )
    else:
        # When not searching, exclude archived opportunities
        query = query.filter(Opportunity.status != 'archived')

    if stage:
        query = query.filter(Opportunity.stage == stage)
    if industry:
        query = query.filter(Opportunity.industry == industry)

    opportunities = query.offset(skip).limit(limit).all()
    return [enrich_opportunity(opp) for opp in opportunities]


@app.get("/api/opportunities/{opp_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opp_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Check access based on role if user is authenticated
    if current_user and current_user.role_id:
        user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        role_name = user_role.name if user_role else None

        if role_name == "Presales Administrator":
            # Can view opportunities assigned to them OR opportunities they assigned to others
            if opportunity.assigned_to_id != current_user.id and opportunity.assigned_by_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Presales Solution Owner":
            # Can view opportunities assigned to them OR opportunities they assigned to others
            if opportunity.assigned_to_id != current_user.id and opportunity.assigned_by_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Presales Solution Member":
            # Can view opportunities assigned to them OR where they are collaborators
            is_collaborator = any(c.user_id == current_user.id for c in opportunity.collaborators)
            if opportunity.assigned_to_id != current_user.id and not is_collaborator:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Sales Owner":
            # Can only view opportunities they created
            if opportunity.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            # Other roles cannot view any opportunities
            raise HTTPException(status_code=403, detail="Access denied")

    return enrich_opportunity(opportunity)


@app.get("/api/opportunities/{opp_id}/team")
async def get_opportunity_team(
    opp_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Reuse the detail endpoint's access rules
    await get_opportunity(opp_id, db, current_user)
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()

    users = []
    seen = set()

    def add(user_id):
        if not user_id or user_id in seen:
            return
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        seen.add(user_id)
        role = db.query(Role).filter(Role.id == user.role_id).first()
        users.append({
            "role": role.name if role else None,
            "name": f"{user.first_name} {user.last_name}".strip(),
            "email": user.email,
        })

    add(opportunity.owner_id)
    add(opportunity.assigned_by_id)
    add(opportunity.assigned_to_id)
    for c in opportunity.collaborators:
        add(c.user_id)
    return users

@app.post("/api/opportunities", response_model=OpportunityResponse)
async def create_opportunity(
    name: str = Form(...),
    customer: str = Form(...),
    industry: str = Form(...),
    region: str = Form(default=""),
    stage: str = Form(default="Discovery"),
    priority: str = Form(default="Medium"),
    estimated_value: Optional[float] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
    http_request: Request = None,
    db: Session = Depends(get_db)
):
    # Manual auth
    auth_header = http_request.headers.get("authorization") if http_request else None
    import logging as logging_module
    logger = logging_module.getLogger(__name__)
    logger.info(f"POST /api/opportunities - Auth header: {auth_header[:50] if auth_header else 'None'}")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid auth header format")

    from auth import settings
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(user_id_str)
    except JWTError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name != "Sales Owner":
        raise HTTPException(status_code=403, detail="Only Sales Owner can create opportunities")

    opportunity = Opportunity(
        opportunity_id=f"OPP-{uuid.uuid4().hex[:8].upper()}",
        name=name,
        customer=customer,
        industry=industry,
        region=region,
        estimated_value=estimated_value,
        stage=stage,
        probability=0.5,
        priority=priority,
        owner_id=current_user.id,
        status="active"
    )
    db.add(opportunity)
    db.commit()

    # Handle file upload if provided
    if file:
        try:
            file_extension = Path(file.filename).suffix.lower()

            # Validate file type
            supported_extensions = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.zip', '.md']
            if file_extension not in supported_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(supported_extensions)}"
                )

            contents = await file.read()

            # Handle ZIP files
            if file_extension == ".zip":
                try:
                    with tempfile.TemporaryDirectory() as temp_dir:
                        temp_zip_path = Path(temp_dir) / file.filename
                        with open(temp_zip_path, 'wb') as f:
                            f.write(contents)

                        # Extract ZIP
                        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                            zip_ref.extractall(temp_dir)

                        # Process all extracted files
                        for extracted_file in Path(temp_dir).rglob('*'):
                            if extracted_file.is_file() and extracted_file.name != file.filename:
                                extracted_extension = extracted_file.suffix.lower()
                                if extracted_extension in ['.pdf', '.docx', '.txt', '.csv', '.doc']:
                                    try:
                                        # Create artifact for each file
                                        artifact_id = f"ART-{uuid.uuid4().hex[:8].upper()}"
                                        artifact_path = UPLOAD_DIR / f"{artifact_id}{extracted_extension}"

                                        # Copy file to storage
                                        shutil.copy(str(extracted_file), str(artifact_path))

                                        # Parse document
                                        parsed_content = document_parser.parse_file(str(artifact_path))

                                        # Create artifact record
                                        artifact = Artifact(
                                            artifact_id=artifact_id,
                                            name=extracted_file.name,
                                            artifact_type="document",
                                            owner_id=current_user.id,
                                            source_reference=str(artifact_path),
                                            description=f"Artifact from {file.filename} for opportunity {opportunity.name}",
                                            version="1.0"
                                        )
                                        db.add(artifact)
                                        db.commit()

                                        # Tokenize and add to vector DB
                                        if parsed_content:
                                            chunks = document_parser.tokenize_text(parsed_content)
                                            artifact_metadata = {
                                                "artifact_id": artifact.id,
                                                "artifact_name": extracted_file.name,
                                                "opportunity_id": opportunity.id,
                                                "opportunity_name": opportunity.name,
                                                "source_zip": file.filename
                                            }
                                            vector_db_service.add_artifact(
                                                artifact_id=f"{artifact.id}",
                                                chunks=chunks,
                                                artifact_metadata=artifact_metadata
                                            )

                                        # Map artifact to opportunity
                                        mapping = OpportunityArtifactMapping(
                                            opportunity_id=opportunity.id,
                                            artifact_id=artifact.id
                                        )
                                        db.add(mapping)
                                        db.commit()

                                    except Exception as e:
                                        logger.error(f"Error processing file {extracted_file.name} from ZIP: {e}")
                                        continue

                except Exception as e:
                    logger.error(f"Error extracting ZIP file: {e}")

            else:
                # Handle single file upload
                artifact_id = f"ART-{uuid.uuid4().hex[:8].upper()}"
                file_path = UPLOAD_DIR / f"{artifact_id}{file_extension}"

                # Save file
                with open(file_path, 'wb') as f:
                    f.write(contents)

                # Parse document
                parsed_content = document_parser.parse_file(str(file_path))

                # Create artifact record
                artifact = Artifact(
                    artifact_id=artifact_id,
                    name=file.filename,
                    artifact_type="document",
                    owner_id=current_user.id,
                    source_reference=str(file_path),
                    description=f"Artifact for opportunity {opportunity.name}",
                    version="1.0"
                )
                db.add(artifact)
                db.commit()

                # Tokenize and add to vector DB
                if parsed_content:
                    chunks = document_parser.tokenize_text(parsed_content)
                    artifact_metadata = {
                        "artifact_id": artifact.id,
                        "artifact_name": file.filename,
                        "opportunity_id": opportunity.id,
                        "opportunity_name": opportunity.name
                    }
                    vector_db_service.add_artifact(
                        artifact_id=f"{artifact.id}",
                        chunks=chunks,
                        artifact_metadata=artifact_metadata
                    )

                # Map artifact to opportunity
                mapping = OpportunityArtifactMapping(
                    opportunity_id=opportunity.id,
                    artifact_id=artifact.id
                )
                db.add(mapping)
                db.commit()

        except Exception as e:
            logger.error(f"Error processing file: {e}")
            # Don't fail opportunity creation if file processing fails
            pass

    return enrich_opportunity(opportunity)


@app.put("/api/opportunities/{opp_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    name: Optional[str] = Form(default=None),
    customer: Optional[str] = Form(default=None),
    industry: Optional[str] = Form(default=None),
    stage: Optional[str] = Form(default=None),
    priority: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    logger.info(f"Updating opportunity {opp_id}: name={name}, customer={customer}, stage={stage}, file={file.filename if file else None}")

    # Update fields if provided (not None and not empty after stripping)
    if name is not None:
        opportunity.name = name
    if customer is not None:
        opportunity.customer = customer
    if industry is not None:
        opportunity.industry = industry
    if stage is not None:
        opportunity.stage = stage
    if priority is not None:
        opportunity.priority = priority

    db.commit()
    db.refresh(opportunity)  # Refresh to get updated values
    logger.info(f"Opportunity {opp_id} updated successfully")

    # Handle file upload if provided
    logger.info(f"File parameter in PUT request: {file is not None}")
    if file is not None:
        try:
            logger.info(f"Processing file upload: {file.filename}")
            file_extension = Path(file.filename).suffix.lower()

            # Validate file type
            supported_extensions = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.zip', '.md']
            if file_extension not in supported_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(supported_extensions)}"
                )

            artifact_id_str = f"ART-{uuid.uuid4().hex[:8].upper()}"
            file_path = UPLOAD_DIR / f"{artifact_id_str}{file_extension}"

            # Save file
            contents = await file.read()
            logger.info(f"File read successfully: {len(contents)} bytes from {file.filename}")

            with open(file_path, 'wb') as f:
                f.write(contents)
            logger.info(f"File saved to disk: {file_path}")

            # Parse document
            try:
                parsed_content = document_parser.parse_file(str(file_path))
                logger.info(f"Document parsed successfully, content length: {len(parsed_content) if parsed_content else 0} chars")
            except Exception as parse_error:
                logger.warning(f"Document parsing failed: {parse_error}, continuing without content")
                parsed_content = None

            # Create artifact record
            artifact_id_value = f"ART-{uuid.uuid4().hex[:8].upper()}"
            artifact = Artifact(
                artifact_id=artifact_id_value,
                name=file.filename,
                artifact_type="document",
                owner_id=opportunity.owner_id,
                source_reference=str(file_path),
                description=f"Artifact for opportunity {opportunity.name}",
                version="1.0"
            )
            db.add(artifact)
            db.flush()  # Flush to ensure artifact gets an ID
            artifact_id_db = artifact.id
            db.commit()
            logger.info(f"Artifact created successfully with database ID: {artifact_id_db}")

            # Tokenize and add to vector DB
            if parsed_content:
                try:
                    chunks = document_parser.tokenize_text(parsed_content)
                    artifact_metadata = {
                        "artifact_id": artifact_id_db,
                        "artifact_name": file.filename,
                        "opportunity_id": opportunity.id,
                        "opportunity_name": opportunity.name
                    }
                    vector_db_service.add_artifact(
                        artifact_id=f"{artifact_id_db}",
                        chunks=chunks,
                        artifact_metadata=artifact_metadata
                    )
                    logger.info(f"Document added to vector DB with ID: {artifact_id_db}")
                except Exception as vector_error:
                    logger.warning(f"Vector DB add failed (continuing): {vector_error}")

            # Map artifact to opportunity
            mapping = OpportunityArtifactMapping(
                opportunity_id=opportunity.id,
                artifact_id=artifact_id_db
            )
            db.add(mapping)
            db.flush()
            db.commit()
            logger.info(f"Artifact {artifact_id_db} mapped to opportunity {opportunity.id}")

            # Verify mapping was created
            verify_mapping = db.query(OpportunityArtifactMapping).filter(
                OpportunityArtifactMapping.opportunity_id == opportunity.id,
                OpportunityArtifactMapping.artifact_id == artifact_id_db
            ).first()
            logger.info(f"Mapping verification: {'SUCCESS' if verify_mapping else 'FAILED'}")

        except Exception as e:
            logger.error(f"Error processing file upload: {e}", exc_info=True)
            # Don't fail the update if file processing fails
            pass

    # Refresh opportunity from database to ensure latest data
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    logger.info(f"Update opportunity endpoint completed for ID: {opp_id}")
    return enrich_opportunity(opportunity)


@app.post("/api/opportunities/{opp_id}/assign")
async def assign_opportunity(
    opp_id: int,
    assigned_to_user_id: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    assigned_user = db.query(User).filter(User.id == assigned_to_user_id).first()
    if not assigned_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get current user's role
    current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    current_role_name = current_user_role.name if current_user_role else None

    # Get assigned user's role
    assigned_user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
    assigned_role_name = assigned_user_role.name if assigned_user_role else None

    # Validate assignment hierarchy
    if current_role_name == "Sales Owner":
        # Sales Owner can assign to Presales Administrator
        if assigned_role_name != "Presales Administrator":
            raise HTTPException(status_code=400, detail="Sales Owner can only assign to Presales Administrator")
    elif current_role_name == "Presales Administrator":
        # Admin can assign to Presales Solution Owner
        if assigned_role_name != "Presales Solution Owner":
            raise HTTPException(status_code=400, detail="Presales Administrator can only assign to Presales Solution Owner")
    elif current_role_name == "Presales Solution Owner":
        # Solution Owner can assign to Presales Solution Member
        if assigned_role_name != "Presales Solution Member":
            raise HTTPException(status_code=400, detail="Presales Solution Owner can only assign to Presales Solution Member")
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to assign opportunities")

    opportunity.assigned_to_id = assigned_to_user_id
    opportunity.assigned_by_id = current_user.id
    db.commit()

    return {
        "message": f"Opportunity assigned to {assigned_user.first_name} {assigned_user.last_name}",
        "opportunity": enrich_opportunity(opportunity)
    }


@app.post("/api/opportunities/{opp_id}/collaborators")
async def add_collaborator(
    opp_id: int,
    collaborator_user_id: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    collaborator_user = db.query(User).filter(User.id == collaborator_user_id).first()
    if not collaborator_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check current user's role
    current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    current_role_name = current_user_role.name if current_user_role else None

    # Check collaborator user's role
    collaborator_role = db.query(Role).filter(Role.id == collaborator_user.role_id).first()
    collaborator_role_name = collaborator_role.name if collaborator_role else None

    # Only Presales Solution Owner can add collaborators
    if current_role_name != "Presales Solution Owner":
        raise HTTPException(status_code=403, detail="Only Presales Solution Owner can add collaborators")

    # Collaborator must be a Presales Solution Member
    if collaborator_role_name != "Presales Solution Member":
        raise HTTPException(status_code=400, detail="Only Presales Solution Members can be added as collaborators")

    # Opportunity must be assigned to current user
    if opportunity.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add collaborators to opportunities assigned to you")

    # Check if already a collaborator
    existing = db.query(OpportunityCollaborator).filter(
        OpportunityCollaborator.opportunity_id == opp_id,
        OpportunityCollaborator.user_id == collaborator_user_id
    ).first()

    reassigned = False
    if existing:
        # A member who already closed their task can be re-assigned
        if opportunity.completion_status == "member_completed" and opportunity.completed_by_id == collaborator_user_id:
            reassigned = True
        else:
            raise HTTPException(status_code=400, detail="User is already a collaborator on this opportunity")

    if not existing:
        db.add(OpportunityCollaborator(
            opportunity_id=opp_id,
            user_id=collaborator_user_id,
            added_by_id=current_user.id
        ))
    # Reopen the task for the member if it was previously closed
    if opportunity.completion_status == "member_completed":
        opportunity.completion_status = "open"
        opportunity.completed_by_id = None
        opportunity.completed_at = None
    db.add(AuditLog(
        user_id=current_user.id,
        role=current_role_name,
        action="member_reassigned" if reassigned else "member_assigned",
        entity="Opportunity",
        entity_id=opportunity.id,
        opportunity_id=opportunity.id,
        new_value={"message": f"{current_user.first_name} {current_user.last_name} {'re-assigned' if reassigned else 'assigned'} {collaborator_user.first_name} {collaborator_user.last_name}"}
    ))
    db.commit()

    logger.info(f"Added {collaborator_user.first_name} {collaborator_user.last_name} as collaborator to opportunity {opp_id}")

    return {
        "message": f"Added {collaborator_user.first_name} {collaborator_user.last_name} as collaborator",
        "opportunity": enrich_opportunity(opportunity)
    }


@app.post("/api/opportunities/{opp_id}/complete")
async def complete_opportunity(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        # Get current user's role
        current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        current_role_name = current_user_role.name if current_user_role else None

        logger.info(f"User {current_user.id} ({current_role_name}) attempting to complete opportunity {opp_id}")

        # Verify user has permission to complete this opportunity
        if current_role_name == "Presales Solution Member":
            # Can complete if assigned to them OR if they're a collaborator
            is_assigned = opportunity.assigned_to_id == current_user.id
            is_collaborator = db.query(OpportunityCollaborator).filter(
                OpportunityCollaborator.opportunity_id == opportunity.id,
                OpportunityCollaborator.user_id == current_user.id
            ).first() is not None

            logger.info(f"Solution Member: assigned={is_assigned}, collaborator={is_collaborator}")

            if not (is_assigned or is_collaborator):
                raise HTTPException(status_code=403, detail="You can only complete opportunities assigned to you")
            opportunity.completion_status = "member_completed"
            db.add(AuditLog(
                user_id=current_user.id,
                role=current_role_name,
                action="member_task_completed",
                entity="Opportunity",
                entity_id=opportunity.id,
                opportunity_id=opportunity.id,
                new_value={"message": f"{current_user.first_name} {current_user.last_name} completed their task"}
            ))

        elif current_role_name == "Presales Solution Owner":
            # Can complete if assigned to them
            if opportunity.assigned_to_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only complete opportunities assigned to you")
            opportunity.completion_status = "owner_completed"
            # Ownership returns to the user who created the opportunity
            creator = db.query(User).filter(User.id == opportunity.owner_id).first()
            if creator and creator.id != current_user.id:
                opportunity.assigned_to_id = creator.id
                db.add(AuditLog(
                    user_id=current_user.id,
                    role=current_role_name,
                    action="assignment_completed",
                    entity="Opportunity",
                    entity_id=opportunity.id,
                    opportunity_id=opportunity.id,
                    new_value={"message": f"{current_user.first_name} {current_user.last_name} completed the assignment; ownership returned to {creator.first_name} {creator.last_name}"}
                ))

        elif current_role_name == "Presales Administrator":
            # Can only complete if they assigned it
            if opportunity.assigned_by_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only complete opportunities you assigned")
            opportunity.completion_status = "admin_completed"

        elif current_role_name == "Sales Owner":
            # Can only complete if they created it
            if opportunity.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only complete opportunities you created")
            opportunity.completion_status = "completed"

        else:
            raise HTTPException(status_code=403, detail="You don't have permission to complete this opportunity")

        opportunity.completed_by_id = current_user.id
        opportunity.completed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Opportunity {opp_id} marked as complete by {current_user.first_name} {current_user.last_name} with status: {opportunity.completion_status}")

        return {
            "message": "Opportunity marked as complete",
            "opportunity": enrich_opportunity(opportunity)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing opportunity {opp_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error completing opportunity: {str(e)}")


@app.get("/api/opportunities/{opp_id}/activity-logs")
async def get_opportunity_activity_logs(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    role_name = role.name if role else None
    if role_name != "Presales Solution Owner" or opportunity.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    logs = db.query(AuditLog).filter(
        AuditLog.opportunity_id == opp_id,
        AuditLog.action.in_(["member_task_completed", "assignment_completed", "member_assigned", "member_reassigned"])
    ).order_by(AuditLog.timestamp.desc()).all()

    result = []
    # Closures recorded before logging existed: synthesize an entry from the completion fields
    if opportunity.completion_status == "member_completed" and opportunity.completed_by_id and not any(l.action == "member_task_completed" for l in logs):
        member = db.query(User).filter(User.id == opportunity.completed_by_id).first()
        if member:
            name = f"{member.first_name} {member.last_name}".strip()
            result.append({
                "id": 0,
                "timestamp": opportunity.completed_at or opportunity.updated_at,
                "action": "member_task_completed",
                "user_name": name,
                "role": "Presales Solution Member",
                "message": f"{name} completed their task",
            })
    return result + [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "action": log.action,
            "user_name": f"{log.user.first_name} {log.user.last_name}".strip() if log.user else None,
            "role": log.role,
            "message": (log.new_value or {}).get("message", log.action),
        }
        for log in logs
    ]


@app.delete("/api/opportunities/{opp_id}")
async def delete_opportunity(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Check if user is Sales Owner
    current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    current_role_name = current_user_role.name if current_user_role else None

    if current_role_name != "Sales Owner":
        raise HTTPException(status_code=403, detail="Only Sales Owner can delete opportunities")

    # Check if user is the owner of this opportunity
    if opportunity.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete opportunities you created")

    # Delete associated artifact mappings first
    db.query(OpportunityArtifactMapping).filter(OpportunityArtifactMapping.opportunity_id == opp_id).delete()

    # Delete the opportunity
    db.delete(opportunity)
    db.commit()

    return {"message": "Opportunity deleted successfully"}


# Artifacts endpoints
@app.get("/api/artifacts", response_model=List[ArtifactResponse])
async def list_artifacts(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
    artifact_type: Optional[str] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None
):
    query = db.query(Artifact)

    if artifact_type:
        query = query.filter(Artifact.artifact_type == artifact_type)
    if industry:
        query = query.filter(Artifact.industry == industry)
    if search:
        query = query.filter(Artifact.name.ilike(f"%{search}%"))

    artifacts = query.offset(skip).limit(limit).all()
    return artifacts


@app.get("/api/artifacts/{art_id}", response_model=ArtifactResponse)
async def get_artifact(
    art_id: int,
    db: Session = Depends(get_db)
):
    artifact = db.query(Artifact).filter(Artifact.id == art_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return artifact


@app.get("/api/artifacts/search/vector")
async def search_artifacts(
    query: str = Query(..., description="Search query"),
    limit: int = Query(5, ge=1, le=20, description="Number of results"),
    artifact_id: Optional[str] = Query(None, description="Optional artifact ID to filter")
):
    """
    Search artifacts using vector similarity

    This endpoint searches through all artifact content using semantic similarity.
    It returns the most relevant chunks from artifacts based on the search query.
    """
    try:
        results = vector_db_service.search(query, n_results=limit, artifact_id=artifact_id)
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        logger.error(f"Error searching artifacts: {e}")
        raise HTTPException(status_code=500, detail="Error searching artifacts")


@app.post("/api/artifacts", response_model=ArtifactResponse)
async def create_artifact(
    name: str = Form(...),
    artifact_type: str = Form(...),
    category: str = Form(None),
    industry: str = Form(None),
    description: str = Form(None),
    summary: str = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Validate file size (100 MB)
    MAX_FILE_SIZE = 100 * 1024 * 1024

    file_path = None
    vector_chunks_count = 0
    artifact_id_str = f"ART-{uuid.uuid4().hex[:8].upper()}"

    if file:
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds 100 MB limit")

        # Generate unique filename
        file_ext = Path(file.filename).suffix if file.filename else ""
        filename = f"{artifact_id_str}{file_ext}"
        file_path = UPLOAD_DIR / filename

        # Save file
        with open(file_path, "wb") as f:
            f.write(contents)

        logger.info(f"Artifact file saved: {file_path}")

        # Parse file and tokenize content
        try:
            raw_text = document_parser.parse_file(file_path)
            chunks = document_parser.tokenize_text(raw_text)

            # Prepare artifact metadata for vector DB
            artifact_metadata = {
                "name": name,
                "artifact_type": artifact_type,
                "industry": industry,
                "source_reference": str(file_path),
            }

            # Add chunks to vector database
            vector_chunks_count = vector_db_service.add_artifact(
                artifact_id_str,
                chunks,
                artifact_metadata
            )
            logger.info(f"Added {vector_chunks_count} chunks to vector database for artifact {artifact_id_str}")

        except Exception as e:
            logger.error(f"Error processing file for vector database: {e}")
            # Don't fail the artifact creation, but log the error
            # The artifact is still created, just without vector embeddings

    # Get first user as default owner (demo mode)
    default_user = db.query(User).first()
    owner_id = default_user.id if default_user else 1

    artifact = Artifact(
        artifact_id=artifact_id_str,
        name=name,
        description=description,
        artifact_type=artifact_type,
        category=category,
        industry=industry,
        technologies=[],
        summary=summary,
        owner_id=owner_id,
        version="1.0",
        status="active",
        source_reference=str(file_path) if file_path else None
    )
    db.add(artifact)
    db.commit()

    logger.info(f"Created artifact {artifact_id_str} with {vector_chunks_count} vector chunks")

    return artifact


# Opportunity-Artifact Mapping endpoints
@app.get("/api/opportunities/{opp_id}/artifacts", response_model=List[ArtifactResponse])
async def get_opportunity_artifacts(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Ensure we're getting fresh data by expiring the session cache
    db.expire_all()

    # Query artifacts through the mappings to ensure we get all artifacts
    artifacts = db.query(Artifact).join(
        OpportunityArtifactMapping,
        Artifact.id == OpportunityArtifactMapping.artifact_id
    ).filter(
        OpportunityArtifactMapping.opportunity_id == opp_id
    ).order_by(Artifact.created_at.desc()).all()

    logger.info(f"Found {len(artifacts)} artifacts for opportunity {opp_id}")
    for artifact in artifacts:
        logger.info(f"  - Artifact {artifact.id}: {artifact.name}")
    return artifacts


@app.post("/api/opportunities/{opp_id}/artifacts/{art_id}", response_model=MappingResponse)
async def map_artifact(
    opp_id: int,
    art_id: int,
    request: MappingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    artifact = db.query(Artifact).filter(Artifact.id == art_id).first()

    if not opportunity or not artifact:
        raise HTTPException(status_code=404, detail="Opportunity or Artifact not found")

    existing = db.query(OpportunityArtifactMapping).filter(
        OpportunityArtifactMapping.opportunity_id == opp_id,
        OpportunityArtifactMapping.artifact_id == art_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Artifact already mapped")

    mapping = OpportunityArtifactMapping(
        opportunity_id=opp_id,
        artifact_id=art_id,
        artifact_version=artifact.version,
        purpose=request.purpose,
        mapped_by_id=current_user.id
    )
    db.add(mapping)

    artifact.usage_count = (artifact.usage_count or 0) + 1

    db.commit()

    audit_log = AuditLog(
        user_id=current_user.id,
        role=current_user.role.name,
        action="map_artifact",
        entity="Mapping",
        entity_id=mapping.id,
        opportunity_id=opp_id,
        artifact_id=art_id
    )
    db.add(audit_log)
    db.commit()

    return mapping


@app.delete("/api/opportunities/{opp_id}/artifacts/{art_id}")
async def unmap_artifact(
    opp_id: int,
    art_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mapping = db.query(OpportunityArtifactMapping).filter(
        OpportunityArtifactMapping.opportunity_id == opp_id,
        OpportunityArtifactMapping.artifact_id == art_id
    ).first()

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    artifact = db.query(Artifact).filter(Artifact.id == art_id).first()
    if artifact and artifact.usage_count > 0:
        artifact.usage_count -= 1

    db.delete(mapping)
    db.commit()

    return {"message": "Artifact unmapped"}


# AI endpoints
@app.post("/api/ai/opportunity-summary")
async def generate_opportunity_summary(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    opp_dict = {
        "name": opportunity.name,
        "customer": opportunity.customer,
        "industry": opportunity.industry,
        "business_problem": opportunity.business_problem,
        "requirements": opportunity.requirements,
        "proposed_solution": opportunity.proposed_solution,
        "technologies": opportunity.technologies
    }

    summary = bedrock_service.generate_opportunity_summary(opp_dict)
    if not summary:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    return {"summary": summary, "is_ai_generated": True}


@app.post("/api/ai/artifact-summary")
async def generate_artifact_summary(
    art_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    artifact = db.query(Artifact).filter(Artifact.id == art_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    art_dict = {
        "name": artifact.name,
        "artifact_type": artifact.artifact_type,
        "description": artifact.description,
        "technologies": artifact.technologies,
        "industry": artifact.industry
    }

    summary = bedrock_service.generate_artifact_summary(art_dict)
    if not summary:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    return {"summary": summary, "is_ai_generated": True}


@app.post("/api/ai/recommend-artifacts")
async def recommend_artifacts(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    all_artifacts = db.query(Artifact).all()
    artifacts_data = [
        {
            "id": art.id,
            "artifact_id": art.artifact_id,
            "name": art.name,
            "artifact_type": art.artifact_type,
            "industry": art.industry
        }
        for art in all_artifacts
    ]

    opp_dict = {
        "name": opportunity.name,
        "industry": opportunity.industry,
        "business_problem": opportunity.business_problem,
        "requirements": opportunity.requirements,
        "technologies": opportunity.technologies
    }

    recommendations = bedrock_service.recommend_artifacts(opp_dict, artifacts_data)
    if not recommendations:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    return {"recommendations": recommendations, "is_ai_generated": True}


@app.post("/api/ai/analyze-opportunity")
async def analyze_opportunity(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    opp_dict = {
        "name": opportunity.name,
        "customer": opportunity.customer,
        "industry": opportunity.industry,
        "business_problem": opportunity.business_problem,
        "requirements": opportunity.requirements,
        "stage": opportunity.stage
    }

    analysis = bedrock_service.analyze_opportunity(opp_dict)
    if not analysis:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    return {"analysis": analysis, "is_ai_generated": True}


# Audit logs endpoint
@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50)
):
    logs = db.query(AuditLog).offset(skip).limit(limit).all()
    return logs


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
