from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite+aiosqlite:///./signal.db"
    SECRET_KEY: str = "change-me-in-production-use-32-plus-random-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    # Accepts JSON array string from env: CORS_ORIGINS='["http://localhost:3000"]'
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    SHOW_DOCS: bool = True
    MEDIA_DIR: str = "./media"
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
