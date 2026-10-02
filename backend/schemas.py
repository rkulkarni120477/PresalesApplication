from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    user_name: str
    role: str


class RoleBase(BaseModel):
    name: str
    description: str


class RoleResponse(RoleBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    role_id: int
    department: str


class UserResponse(UserBase):
    id: int
    status: str
    avatar: str
    created_at: datetime
    last_login: Optional[datetime]
    role: RoleResponse

    class Config:
        from_attributes = True


class OpportunityBase(BaseModel):
    name: str
    customer: str
    industry: str
    region: str
    description: Optional[str] = None
    business_problem: Optional[str] = None
    requirements: Optional[str] = None
    proposed_solution: Optional[str] = None
    estimated_value: Optional[float] = None
    stage: str
    probability: Optional[float] = None
    priority: str
    technologies: Optional[List[str]] = None


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    name: Optional[str] = None
    customer: Optional[str] = None
    industry: Optional[str] = None
    stage: Optional[str] = None
    probability: Optional[float] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class OpportunityResponse(OpportunityBase):
    id: int
    opportunity_id: str
    owner_id: int
    assigned_to_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime
    owner_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True


class ArtifactBase(BaseModel):
    name: str
    description: Optional[str] = None
    artifact_type: str
    category: Optional[str] = None
    industry: Optional[str] = None
    technologies: Optional[List[str]] = None
    summary: Optional[str] = None


class ArtifactCreate(ArtifactBase):
    pass


class ArtifactUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    artifact_type: Optional[str] = None
    status: Optional[str] = None


class ArtifactResponse(ArtifactBase):
    id: int
    artifact_id: str
    version: str
    owner_id: int
    status: str
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MappingCreate(BaseModel):
    artifact_id: int
    purpose: Optional[str] = None


class MappingResponse(BaseModel):
    id: int
    opportunity_id: int
    artifact_id: int
    artifact_version: str
    purpose: Optional[str]
    mapping_date: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: int
    action: str
    entity: str
    entity_id: int
    previous_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    bedrock_configured: bool
    aws_region: str
    configured_model: str
    connectivity_status: str


class AIRecommendationResponse(BaseModel):
    artifact_id: int
    artifact_name: str
    relevance_score: float
    reason: str
