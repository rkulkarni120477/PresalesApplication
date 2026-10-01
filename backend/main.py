from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
import uuid
import logging

from database import get_db, init_db
from models import User, Opportunity, Artifact, OpportunityArtifactMapping, AuditLog
from schemas import (
    LoginRequest, TokenResponse, UserResponse, OpportunityCreate,
    OpportunityUpdate, OpportunityResponse, ArtifactCreate, ArtifactResponse,
    MappingCreate, MappingResponse, AuditLogResponse, HealthResponse, AIRecommendationResponse
)
from auth import create_access_token, get_current_user, verify_password, hash_password
from services.bedrock_service import bedrock_service
from seed import seed_database

app = FastAPI(title="Presales Platform API")

logger = logging.getLogger(__name__)

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
    access_token = create_access_token(data={"sub": demo_user["id"]})
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
    skip: int = Query(0),
    limit: int = Query(50),
    stage: Optional[str] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None
):
    query = db.query(Opportunity)

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
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity


@app.post("/api/opportunities", response_model=OpportunityResponse)
async def create_opportunity(
    request: OpportunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = Opportunity(
        opportunity_id=f"OPP-{uuid.uuid4().hex[:8].upper()}",
        name=request.name,
        customer=request.customer,
        industry=request.industry,
        region=request.region,
        description=request.description,
        business_problem=request.business_problem,
        requirements=request.requirements,
        proposed_solution=request.proposed_solution,
        estimated_value=request.estimated_value,
        stage=request.stage,
        probability=request.probability,
        priority=request.priority,
        owner_id=current_user.id,
        technologies=request.technologies,
        status="active"
    )
    db.add(opportunity)
    db.flush()

    audit_log = AuditLog(
        user_id=current_user.id,
        role=current_user.role.name,
        action="create",
        entity="Opportunity",
        entity_id=opportunity.id,
        opportunity_id=opportunity.id,
        new_value={"name": opportunity.name}
    )
    db.add(audit_log)
    db.commit()
    return opportunity


@app.put("/api/opportunities/{opp_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opp_id: int,
    request: OpportunityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    previous_value = {"name": opportunity.name, "stage": opportunity.stage}

    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(opportunity, field, value)

    db.commit()

    audit_log = AuditLog(
        user_id=current_user.id,
        role=current_user.role.name,
        action="update",
        entity="Opportunity",
        entity_id=opportunity.id,
        opportunity_id=opportunity.id,
        previous_value=previous_value,
        new_value=update_data
    )
    db.add(audit_log)
    db.commit()
    return opportunity


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


@app.post("/api/artifacts", response_model=ArtifactResponse)
async def create_artifact(
    request: ArtifactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    artifact = Artifact(
        artifact_id=f"ART-{uuid.uuid4().hex[:8].upper()}",
        name=request.name,
        description=request.description,
        artifact_type=request.artifact_type,
        category=request.category,
        industry=request.industry,
        technologies=request.technologies,
        summary=request.summary,
        owner_id=current_user.id,
        version="1.0",
        status="active"
    )
    db.add(artifact)
    db.commit()
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
