from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./docusense.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    GEMINI_API_KEY: str = ""
    STORAGE_TYPE: str = "local"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET: str = ""
    CONFIDENCE_THRESHOLD: float = 75.0
    MAX_FILE_SIZE: int = 52428800
    SECRET_KEY: str = "change-this-in-production"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    TESSERACT_CMD: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()