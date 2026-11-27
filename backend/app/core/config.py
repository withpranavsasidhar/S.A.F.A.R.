import os

class Settings:
    PROJECT_NAME: str = "S.A.F.A.R."
    VERSION: str = "2.0.0-review2"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "safar-super-secret-jwt-key-2026-btech-capstone")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safar.db")

settings = Settings()
