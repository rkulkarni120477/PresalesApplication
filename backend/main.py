from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
import uuid
import logging
import os
from pathlib import Path
import shutil

from database import get_db, init_db
from models import User, Opportunity, Artifact, OpportunityArtifactMapping, AuditLog
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
        # Can only see opportunities assigned to them by Sales Owner
        query = query.filter(Opportunity.assigned_to_id == current_user.id)
    elif role_name == "Presales Solution Owner":
        # Can only see opportunities assigned to them by Presales Administrator
        query = query.filter(Opportunity.assigned_to_id == current_user.id)
    elif role_name == "Presales Solution Member":
        # Can only see opportunities assigned to them by Presales Solution Owner
        query = query.filter(Opportunity.assigned_to_id == current_user.id)
    elif role_name == "Sales Owner":
        # Can only see opportunities that have been assigned (not unassigned)
        query = query.filter(Opportunity.assigned_to_id != None)
    else:
        # Other roles cannot see any opportunities
        return []

    if stage:
        query = query.filter(Opportunity.stage == stage)
    if industry:
        query = query.filter(Opportunity.industry == industry)
    if search:
        query = query.filter(
            (Opportunity.name.ilike(f"%{search}%")) |
            (Opportunity.customer.ilike(f"%{search}%"))
        )

    opportunities = query.offset(skip).limit(limit).all()
    return opportunities


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
            # Can only view opportunities assigned to them
            if opportunity.assigned_to_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Presales Solution Owner":
            # Can only view opportunities assigned to them
            if opportunity.assigned_to_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Presales Solution Member":
            # Can only view opportunities assigned to them
            if opportunity.assigned_to_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif role_name == "Sales Owner":
            # Can only view opportunities they created AND have been assigned to someone
            if opportunity.owner_id != current_user.id or opportunity.assigned_to_id is None:
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            # Other roles cannot view any opportunities
            raise HTTPException(status_code=403, detail="Access denied")

    return opportunity


@app.post("/api/opportunities", response_model=OpportunityResponse)
async def create_opportunity(
    request: OpportunityCreate,
    http_request: Request,
    db: Session = Depends(get_db)
):
    # Manual auth for debugging
    auth_header = http_request.headers.get("authorization")
    import logging as logging_module
    logger = logging_module.getLogger(__name__)
    logger.info(f"POST /api/opportunities - Auth header: {auth_header[:50] if auth_header else 'None'}")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Extract token
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid auth header format")

    # Validate token
    from auth import settings
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(user_id_str)
        logger.info(f"Token valid for user {user_id}")
    except JWTError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    # Check role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Only Sales Owner can create opportunities
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name != "Sales Owner":
        raise HTTPException(status_code=403, detail="Only Sales Owner can create opportunities")

    opportunity = Opportunity(
        opportunity_id=f"OPP-{uuid.uuid4().hex[:8].upper()}",
        name=request.name,
        customer=request.customer,
        industry=request.industry,
        region=request.region,
        description=request.description if hasattr(request, 'description') else None,
        business_problem=request.business_problem if hasattr(request, 'business_problem') else None,
        requirements=request.requirements if hasattr(request, 'requirements') else None,
        proposed_solution=request.proposed_solution if hasattr(request, 'proposed_solution') else None,
        estimated_value=request.estimated_value,
        stage=request.stage,
        probability=request.probability if hasattr(request, 'probability') else 0.5,
        priority=request.priority,
        owner_id=current_user.id,
        technologies=request.technologies if hasattr(request, 'technologies') else [],
        status="active"
    )
    db.add(opportunity)
    db.commit()
    return opportunity


@app.put("/api/opportunities/{opp_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opp_id: int,
    request: OpportunityUpdate,
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(opportunity, field, value)

    db.commit()
    return opportunity


@app.post("/api/opportunities/{opp_id}/assign")
async def assign_opportunity(
    opp_id: int,
    assigned_to_user_id: int,
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
        "opportunity": opportunity
    }


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
    return opportunity.artifacts


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
