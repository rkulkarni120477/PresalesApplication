from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Role, Permission, User, Opportunity, Artifact, OpportunityArtifactMapping, AuditLog
from auth import hash_password
from database import SessionLocal
import json

SAMPLE_OPPORTUNITIES = [
    {
        "opportunity_id": "OPP-001",
        "name": "GlobalBank Digital Transformation",
        "customer": "GlobalBank International",
        "industry": "Finance",
        "region": "APAC",
        "description": "Comprehensive digital transformation initiative for a global banking institution",
        "business_problem": "Legacy systems limiting customer experience and operational efficiency",
        "requirements": "Cloud migration, API modernization, customer analytics",
        "proposed_solution": "Microservices architecture on AWS, modern banking platform",
        "estimated_value": 5000000,
        "stage": "Solutioning",
        "probability": 0.75,
        "priority": "High",
        "technologies": ["AWS", "Microservices", "API", "Analytics"],
        "risks": "Complex migration timeline, data consistency",
    },
    {
        "opportunity_id": "OPP-002",
        "name": "HealthFirst Patient Engagement Platform",
        "customer": "HealthFirst Healthcare",
        "industry": "Healthcare",
        "region": "North America",
        "description": "Patient-centric digital health engagement platform",
        "business_problem": "Poor patient engagement and operational inefficiencies",
        "requirements": "HIPAA compliance, mobile-first design, real-time notifications",
        "proposed_solution": "Cloud-based patient engagement platform with AI recommendations",
        "estimated_value": 3500000,
        "stage": "Proposal",
        "probability": 0.6,
        "priority": "High",
        "technologies": ["AWS", "React", "Python", "Healthcare IT"],
        "risks": "Regulatory compliance complexity, data security",
    },
    {
        "opportunity_id": "OPP-003",
        "name": "RetailOne Cloud Modernization",
        "customer": "RetailOne Corp",
        "industry": "Retail",
        "region": "Europe",
        "description": "Migrate retail operations to cloud-native architecture",
        "business_problem": "On-premise infrastructure limiting scalability",
        "requirements": "Scalability, 99.9% uptime, cost optimization",
        "proposed_solution": "Container orchestration and serverless architecture",
        "estimated_value": 4200000,
        "stage": "Negotiation",
        "probability": 0.8,
        "priority": "Critical",
        "technologies": ["Kubernetes", "AWS", "Docker", "Serverless"],
        "risks": "Migration complexity, customer downtime",
    },
    {
        "opportunity_id": "OPP-004",
        "name": "FinServe AI Customer Service",
        "customer": "FinServe Solutions",
        "industry": "Finance",
        "region": "APAC",
        "description": "AI-powered customer service platform for financial services",
        "business_problem": "High customer service costs, slow response times",
        "requirements": "Conversational AI, sentiment analysis, multi-channel support",
        "proposed_solution": "GenAI-powered contact center with knowledge base integration",
        "estimated_value": 2800000,
        "stage": "Discovery",
        "probability": 0.5,
        "priority": "Medium",
        "technologies": ["AWS Bedrock", "LLM", "NLP", "Contact Center"],
        "risks": "Model accuracy, regulatory compliance",
    },
    {
        "opportunity_id": "OPP-005",
        "name": "EduWorld Learning Platform",
        "customer": "EduWorld Inc",
        "industry": "Education",
        "region": "Global",
        "description": "Next-generation online learning management system",
        "business_problem": "Legacy LMS not supporting modern pedagogy",
        "requirements": "Video streaming, collaborative tools, AI-powered recommendations",
        "proposed_solution": "Cloud-native LMS with generative AI features",
        "estimated_value": 3200000,
        "stage": "Qualification",
        "probability": 0.65,
        "priority": "High",
        "technologies": ["AWS", "React", "Python", "AI/ML"],
        "risks": "User adoption, content migration",
    },
    {
        "opportunity_id": "OPP-006",
        "name": "ManufacturingPro IoT Transformation",
        "customer": "ManufacturingPro Ltd",
        "industry": "Manufacturing",
        "region": "APAC",
        "description": "IoT-based smart factory implementation",
        "business_problem": "Lack of real-time production visibility and predictive maintenance",
        "requirements": "IoT sensors, real-time analytics, predictive models",
        "proposed_solution": "AWS IoT platform with analytics and ML-based predictive maintenance",
        "estimated_value": 4500000,
        "stage": "Solutioning",
        "probability": 0.7,
        "priority": "High",
        "technologies": ["AWS IoT", "Edge Computing", "ML", "Analytics"],
        "risks": "Legacy equipment integration, data volume",
    },
    {
        "opportunity_id": "OPP-007",
        "name": "LogisticsPlus Supply Chain Platform",
        "customer": "LogisticsPlus Global",
        "industry": "Logistics",
        "region": "Europe",
        "description": "End-to-end supply chain visibility platform",
        "business_problem": "Fragmented systems reducing visibility and efficiency",
        "requirements": "Real-time tracking, predictive analytics, integration",
        "proposed_solution": "Cloud-based supply chain platform with AI optimization",
        "estimated_value": 3800000,
        "stage": "Proposal",
        "probability": 0.75,
        "priority": "High",
        "technologies": ["AWS", "API", "Analytics", "AI"],
        "risks": "Multi-stakeholder coordination, data quality",
    },
    {
        "opportunity_id": "OPP-008",
        "name": "InsuranceOne Claims Automation",
        "customer": "InsuranceOne Corp",
        "industry": "Insurance",
        "region": "North America",
        "description": "Automated claims processing using AI and RPA",
        "business_problem": "Manual claims processing causing delays and errors",
        "requirements": "Automation, accuracy, compliance, scalability",
        "proposed_solution": "AI-powered claims automation with RPA",
        "estimated_value": 3000000,
        "stage": "Negotiation",
        "probability": 0.8,
        "priority": "Critical",
        "technologies": ["RPA", "AI", "AWS", "Document Processing"],
        "risks": "Complex rules, regulatory constraints",
    },
    {
        "opportunity_id": "OPP-009",
        "name": "TelecomConnect Customer Experience",
        "customer": "TelecomConnect Inc",
        "industry": "Telecommunications",
        "region": "Global",
        "description": "Unified customer experience platform",
        "business_problem": "Siloed systems and poor customer experience",
        "requirements": "360-degree customer view, omnichannel support, personalization",
        "proposed_solution": "Cloud-based CDP with personalization engine",
        "estimated_value": 5500000,
        "stage": "Discovery",
        "probability": 0.55,
        "priority": "High",
        "technologies": ["AWS", "CDP", "Analytics", "API"],
        "risks": "Data integration complexity, scale challenges",
    },
    {
        "opportunity_id": "OPP-010",
        "name": "PharmaCare Data & Analytics",
        "customer": "PharmaCare Solutions",
        "industry": "Pharmaceuticals",
        "region": "EMEA",
        "description": "Enterprise data platform for pharma analytics",
        "business_problem": "Disparate data sources limiting insights",
        "requirements": "Data consolidation, advanced analytics, compliance",
        "proposed_solution": "Cloud data warehouse with analytics and BI",
        "estimated_value": 4000000,
        "stage": "Solutioning",
        "probability": 0.7,
        "priority": "Medium",
        "technologies": ["Snowflake", "AWS", "Python", "BI"],
        "risks": "Data governance, regulatory compliance",
    },
]

SAMPLE_ARTIFACTS = [
    {
        "artifact_id": "ART-001",
        "name": "Banking Cloud Reference Architecture",
        "artifact_type": "Reference Architecture",
        "category": "Architecture",
        "description": "Comprehensive cloud reference architecture for banking",
        "industry": "Finance",
        "technologies": ["AWS", "Microservices", "API"],
        "summary": "Enterprise-grade cloud architecture for banking institutions",
    },
    {
        "artifact_id": "ART-002",
        "name": "Enterprise AI Architecture",
        "artifact_type": "Architecture",
        "category": "Architecture",
        "description": "Scalable AI/ML platform architecture",
        "industry": "Multiple",
        "technologies": ["AWS", "ML", "Bedrock"],
        "summary": "Production-ready AI/ML platform architecture",
    },
    {
        "artifact_id": "ART-003",
        "name": "RAG Solution Architecture",
        "artifact_type": "Solution Design",
        "category": "Architecture",
        "description": "Retrieval-Augmented Generation architecture",
        "industry": "Multiple",
        "technologies": ["AWS Bedrock", "Vector DB", "Python"],
        "summary": "Enterprise RAG solution design pattern",
    },
    {
        "artifact_id": "ART-004",
        "name": "Customer Service Chatbot Proposal",
        "artifact_type": "Proposal",
        "category": "Sales",
        "description": "AI-powered customer service solution",
        "industry": "Finance",
        "technologies": ["AWS Bedrock", "Contact Center", "NLP"],
        "summary": "Ready-to-use customer service chatbot proposal",
    },
    {
        "artifact_id": "ART-005",
        "name": "Cloud Migration Proposal",
        "artifact_type": "Proposal",
        "category": "Sales",
        "description": "Phased cloud migration approach",
        "industry": "Multiple",
        "technologies": ["AWS", "Migration", "Planning"],
        "summary": "Comprehensive cloud migration proposal template",
    },
    {
        "artifact_id": "ART-006",
        "name": "Data Platform Architecture",
        "artifact_type": "Architecture",
        "category": "Architecture",
        "description": "Modern data platform design",
        "industry": "Multiple",
        "technologies": ["AWS", "Data Lake", "Analytics"],
        "summary": "Enterprise data platform blueprint",
    },
    {
        "artifact_id": "ART-007",
        "name": "Zero Trust Security Architecture",
        "artifact_type": "Security Document",
        "category": "Security",
        "description": "Zero trust security implementation",
        "industry": "Multiple",
        "technologies": ["IAM", "Encryption", "Security"],
        "summary": "Zero trust security framework",
    },
    {
        "artifact_id": "ART-008",
        "name": "API Integration Architecture",
        "artifact_type": "Architecture",
        "category": "Architecture",
        "description": "Enterprise API integration patterns",
        "industry": "Multiple",
        "technologies": ["API Gateway", "Integration", "AWS"],
        "summary": "Scalable API integration architecture",
    },
    {
        "artifact_id": "ART-009",
        "name": "Microservices Reference Architecture",
        "artifact_type": "Reference Architecture",
        "category": "Architecture",
        "description": "Production microservices architecture",
        "industry": "Multiple",
        "technologies": ["Kubernetes", "Docker", "AWS"],
        "summary": "Enterprise-grade microservices design",
    },
    {
        "artifact_id": "ART-010",
        "name": "AI Governance Framework",
        "artifact_type": "Compliance Document",
        "category": "Compliance",
        "description": "AI governance and ethics framework",
        "industry": "Multiple",
        "technologies": ["Governance", "Ethics", "Compliance"],
        "summary": "Enterprise AI governance policies",
    },
    {
        "artifact_id": "ART-011",
        "name": "GenAI Business Case",
        "artifact_type": "Business Case",
        "category": "Sales",
        "description": "ROI justification for GenAI investments",
        "industry": "Multiple",
        "technologies": ["GenAI", "Economics", "Strategy"],
        "summary": "Business case template for AI initiatives",
    },
    {
        "artifact_id": "ART-012",
        "name": "Customer Experience Transformation",
        "artifact_type": "Proposal",
        "category": "Sales",
        "description": "Digital customer experience transformation",
        "industry": "Retail",
        "technologies": ["CDP", "Analytics", "Cloud"],
        "summary": "Customer experience modernization proposal",
    },
    {
        "artifact_id": "ART-013",
        "name": "Healthcare Data Platform",
        "artifact_type": "Solution Design",
        "category": "Architecture",
        "description": "HIPAA-compliant health data platform",
        "industry": "Healthcare",
        "technologies": ["AWS", "Healthcare IT", "Compliance"],
        "summary": "Secure healthcare data infrastructure",
    },
    {
        "artifact_id": "ART-014",
        "name": "IoT Platform Architecture",
        "artifact_type": "Architecture",
        "category": "Architecture",
        "description": "Industrial IoT platform design",
        "industry": "Manufacturing",
        "technologies": ["AWS IoT", "Edge", "ML"],
        "summary": "Enterprise IoT platform blueprint",
    },
    {
        "artifact_id": "ART-015",
        "name": "DevSecOps Implementation Plan",
        "artifact_type": "Implementation Plan",
        "category": "Architecture",
        "description": "DevSecOps practices and tools",
        "industry": "Multiple",
        "technologies": ["Security", "DevOps", "CI/CD"],
        "summary": "DevSecOps transformation roadmap",
    },
]


def create_roles_and_permissions(db: Session):
    """Create roles and permissions"""
    roles_data = [
        {
            "name": "Presales Solution Owner",
            "description": "Full access to opportunities and artifacts",
            "permissions": [
                "view_all_opportunities",
                "create_opportunity",
                "edit_opportunity",
                "archive_opportunity",
                "view_all_artifacts",
                "create_artifact",
                "edit_artifact",
                "archive_artifact",
                "map_artifacts",
                "manage_ownership",
                "view_reports",
                "view_audit_logs",
            ]
        },
        {
            "name": "Presales Solution Member",
            "description": "Limited access based on assignment",
            "permissions": [
                "view_assigned_opportunities",
                "create_opportunity",
                "view_artifacts",
                "create_artifact",
                "search_artifacts",
                "view_reports",
            ]
        },
        {
            "name": "Guest",
            "description": "Read-only access",
            "permissions": [
                "view_opportunities",
                "view_artifacts",
                "search",
            ]
        },
        {
            "name": "Administrator",
            "description": "Full system access",
            "permissions": [
                "manage_users",
                "manage_roles",
                "manage_all_opportunities",
                "manage_all_artifacts",
                "view_audit_logs",
                "system_configuration",
            ]
        }
    ]

    for role_data in roles_data:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(name=role_data["name"], description=role_data["description"])
            db.add(role)
            db.flush()

            for perm_name in role_data["permissions"]:
                permission = Permission(name=perm_name, role_id=role.id)
                db.add(permission)

    db.commit()


def create_users(db: Session):
    """Create demo users"""
    users_data = [
        {"first_name": "Priya", "last_name": "Sharma", "email": "priya.sharma@example.com", "role_name": "Presales Solution Owner", "dept": "Sales"},
        {"first_name": "Amit", "last_name": "Kulkarni", "email": "amit.kulkarni@example.com", "role_name": "Presales Solution Owner", "dept": "Sales"},
        {"first_name": "Rahul", "last_name": "Mehta", "email": "rahul.mehta@example.com", "role_name": "Presales Solution Member", "dept": "Sales"},
        {"first_name": "Sneha", "last_name": "Patil", "email": "sneha.patil@example.com", "role_name": "Presales Solution Member", "dept": "Sales"},
        {"first_name": "Neha", "last_name": "Joshi", "email": "neha.joshi@example.com", "role_name": "Guest", "dept": "Operations"},
        {"first_name": "Arjun", "last_name": "Desai", "email": "arjun.desai@example.com", "role_name": "Guest", "dept": "Operations"},
        {"first_name": "Vikram", "last_name": "Shah", "email": "vikram.shah@example.com", "role_name": "Administrator", "dept": "IT"},
        {"first_name": "Ananya", "last_name": "Rao", "email": "ananya.rao@example.com", "role_name": "Administrator", "dept": "IT"},
    ]

    for user_data in users_data:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            role = db.query(Role).filter(Role.name == user_data["role_name"]).first()
            user = User(
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                email=user_data["email"],
                password_hash=hash_password("Demo@123"),
                role_id=role.id,
                department=user_data["dept"],
                status="active",
                avatar=f"https://ui-avatars.com/api/?name={user_data['first_name']}+{user_data['last_name']}&background=random",
                is_demo=True
            )
            db.add(user)

    db.commit()


def create_opportunities(db: Session):
    """Create sample opportunities"""
    owner = db.query(User).filter(User.email == "priya.sharma@example.com").first()

    for opp_data in SAMPLE_OPPORTUNITIES:
        existing = db.query(Opportunity).filter(Opportunity.opportunity_id == opp_data["opportunity_id"]).first()
        if not existing:
            opportunity = Opportunity(
                opportunity_id=opp_data["opportunity_id"],
                name=opp_data["name"],
                customer=opp_data["customer"],
                industry=opp_data["industry"],
                region=opp_data["region"],
                description=opp_data["description"],
                business_problem=opp_data["business_problem"],
                requirements=opp_data["requirements"],
                proposed_solution=opp_data["proposed_solution"],
                estimated_value=opp_data["estimated_value"],
                currency="USD",
                stage=opp_data["stage"],
                probability=opp_data["probability"],
                priority=opp_data["priority"],
                owner_id=owner.id,
                target_close_date=datetime.utcnow() + timedelta(days=90),
                status="active",
                technologies=opp_data["technologies"],
                risks=opp_data["risks"],
                is_demo=True,
                source_type="Public Internet Reference",
                source_reference="Internal Sample Data"
            )
            db.add(opportunity)

    db.commit()


def create_artifacts(db: Session):
    """Create sample artifacts"""
    owner = db.query(User).filter(User.email == "priya.sharma@example.com").first()

    for art_data in SAMPLE_ARTIFACTS:
        existing = db.query(Artifact).filter(Artifact.artifact_id == art_data["artifact_id"]).first()
        if not existing:
            artifact = Artifact(
                artifact_id=art_data["artifact_id"],
                name=art_data["name"],
                description=art_data["description"],
                artifact_type=art_data["artifact_type"],
                category=art_data["category"],
                version="1.0",
                owner_id=owner.id,
                status="active",
                industry=art_data["industry"],
                technologies=art_data["technologies"],
                summary=art_data["summary"],
                is_demo=True,
                source_type="Public Internet Reference",
                source_reference="Internal Sample Data"
            )
            db.add(artifact)

    db.commit()


def create_mappings(db: Session):
    """Create sample opportunity-artifact mappings"""
    user = db.query(User).filter(User.email == "priya.sharma@example.com").first()

    mappings = [
        ("OPP-001", "ART-001"),
        ("OPP-001", "ART-009"),
        ("OPP-002", "ART-013"),
        ("OPP-003", "ART-006"),
        ("OPP-004", "ART-002"),
        ("OPP-005", "ART-002"),
        ("OPP-006", "ART-014"),
        ("OPP-007", "ART-006"),
        ("OPP-008", "ART-003"),
        ("OPP-009", "ART-012"),
        ("OPP-010", "ART-006"),
    ]

    for opp_id, art_id in mappings:
        opportunity = db.query(Opportunity).filter(Opportunity.opportunity_id == opp_id).first()
        artifact = db.query(Artifact).filter(Artifact.artifact_id == art_id).first()

        existing = db.query(OpportunityArtifactMapping).filter(
            OpportunityArtifactMapping.opportunity_id == opportunity.id,
            OpportunityArtifactMapping.artifact_id == artifact.id
        ).first()

        if not existing:
            mapping = OpportunityArtifactMapping(
                opportunity_id=opportunity.id,
                artifact_id=artifact.id,
                artifact_version="1.0",
                mapped_by_id=user.id,
                status="active"
            )
            db.add(mapping)
            artifact.usage_count = (artifact.usage_count or 0) + 1

    db.commit()


def seed_database():
    """Run all seeding functions"""
    db = SessionLocal()
    try:
        print("Creating roles and permissions...")
        create_roles_and_permissions(db)

        print("Creating users...")
        create_users(db)

        print("Creating opportunities...")
        create_opportunities(db)

        print("Creating artifacts...")
        create_artifacts(db)

        print("Creating mappings...")
        create_mappings(db)

        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
