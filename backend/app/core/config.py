"""Application settings, read from environment variables or a local .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # The API connects as `pulse_app`, a normal role that is subject to
    # row-level security. Migrations connect as the database owner.
    database_url: str = "postgresql+psycopg://pulse_app:pulse_app_dev@localhost:5432/pulse"
    migration_database_url: str = "postgresql+psycopg://pulse:pulse_dev@localhost:5432/pulse"

    # Development default only. Set JWT_SECRET to a long random value anywhere else.
    jwt_secret: str = "pulse-development-secret-change-me-0123456789"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 7

    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
