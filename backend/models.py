from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON, Enum, Table, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum as python_enum

Base = declarative_base()


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    permissions = relationship("Permission", back_populates="role")
    users = relationship("User", back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    description = Column(Text)
    role_id = Column(Integer, ForeignKey("roles.id"))

    role = relationship("Role", back_populates="permissions")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    role_id = Column(Integer, ForeignKey("roles.id"))
    department = Column(String(100))
    status = Column(String(50), default="active")
    avatar = Column(String(255))
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_login = Column(DateTime)

    role = relationship("Role", back_populates="users")
    opportunities = relationship("Opportunity", foreign_keys="Opportunity.owner_id", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")
    artifacts = relationship("Artifact", back_populates="owner")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(String(50), unique=True, index=True)
    name = Column(String(255), index=True)
    customer = Column(String(255))
    industry = Column(String(100), index=True)
    region = Column(String(100))
    description = Column(Text)
    business_problem = Column(Text)
    requirements = Column(Text)
    proposed_solution = Column(Text)
    estimated_value = Column(Float)
    currency = Column(String(10), default="USD")
    stage = Column(String(100), index=True)
    probability = Column(Float)
    priority = Column(String(50))
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team = Column(String(255))
    target_close_date = Column(DateTime)
    status = Column(String(50), default="active")
    technologies = Column(JSON)
    risks = Column(Text)
    assumptions = Column(Text)
    source_type = Column(String(100))
    source_reference = Column(String(500))
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="opportunities")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    artifacts = relationship("Artifact", secondary="opportunity_artifact_mappings", back_populates="opportunities")
    mappings = relationship("OpportunityArtifactMapping", back_populates="opportunity")
    audit_logs = relationship("AuditLog", foreign_keys="AuditLog.opportunity_id", back_populates="opportunity")


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    artifact_id = Column(String(50), unique=True, index=True)
    name = Column(String(255), index=True)
    description = Column(Text)
    artifact_type = Column(String(100), index=True)
    category = Column(String(100))
    version = Column(String(50))
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String(50), default="active")
    industry = Column(String(100), index=True)
    technologies = Column(JSON)
    tags = Column(JSON)
    summary = Column(Text)
    applicable_use_cases = Column(Text)
    source_type = Column(String(100))
    source_reference = Column(String(500))
    is_demo = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="artifacts")
    opportunities = relationship("Opportunity", secondary="opportunity_artifact_mappings", back_populates="artifacts")
    mappings = relationship("OpportunityArtifactMapping", back_populates="artifact")


class OpportunityArtifactMapping(Base):
    __tablename__ = "opportunity_artifact_mappings"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), index=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id"), index=True)
    artifact_version = Column(String(50))
    purpose = Column(Text)
    mapped_by_id = Column(Integer, ForeignKey("users.id"))
    mapping_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")
    notes = Column(Text)

    opportunity = relationship("Opportunity", back_populates="mappings")
    artifact = relationship("Artifact", back_populates="mappings")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(100))
    action = Column(String(100), index=True)
    entity = Column(String(100))
    entity_id = Column(Integer, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    artifact_id = Column(Integer, ForeignKey("artifacts.id"))
    previous_value = Column(JSON)
    new_value = Column(JSON)

    user = relationship("User", back_populates="audit_logs")
    opportunity = relationship("Opportunity", foreign_keys=[opportunity_id], back_populates="audit_logs")


class AIRequest(Base):
    __tablename__ = "ai_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    request_id = Column(String(100), unique=True)
    operation = Column(String(100))
    model_id = Column(String(255))
    entity_type = Column(String(100))
    entity_id = Column(Integer)
    status = Column(String(50))
    latency_ms = Column(Integer)
    token_usage = Column(JSON)
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
