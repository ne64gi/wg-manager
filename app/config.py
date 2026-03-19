import os

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "sqlite:////data/wg-studio.db"
    log_database_url: str = "sqlite:////data/wg-studio-log.db"


settings = Settings(
    database_url=os.getenv("DATABASE_URL", "sqlite:////data/wg-studio.db"),
    log_database_url=os.getenv("LOG_DATABASE_URL", "sqlite:////data/wg-studio-log.db"),
)
