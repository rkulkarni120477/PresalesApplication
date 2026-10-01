import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://presales:presales@localhost:5432/presales_db"

    # AWS
    aws_region: str = os.getenv("AWS_REGION", "ap-south-1")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    bedrock_model_id: str = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Demo
    demo_password: str = "Demo@123"

    class Config:
        env_file = ".env"


settings = Settings()
