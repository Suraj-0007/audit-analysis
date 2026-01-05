"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server
    APP_NAME: str = "ProdReady Audit"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Session settings
    SESSION_TTL_MINUTES: int = 30
    
    # Playwright settings
    PLAYWRIGHT_HEADLESS: bool = False  # False for login, True for audit
    PLAYWRIGHT_TIMEOUT_MS: int = 30000
    PLAYWRIGHT_NAVIGATION_TIMEOUT_MS: int = 60000
    
    # Audit settings
    MAX_PAGES_PER_AUDIT: int = 20
    MAX_DEPTH: int = 2
    PAGE_LOAD_WAIT_MS: int = 3000
    
    # Artifacts
    ARTIFACTS_DIR: str = "./artifacts"
    
    # Security
    ALLOW_PRIVATE_IPS: bool = False
    RATE_LIMIT_PER_MINUTE: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Ensure artifacts directory exists
os.makedirs(settings.ARTIFACTS_DIR, exist_ok=True)
