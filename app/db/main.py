from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core import settings


class Base(DeclarativeBase):
    pass


def _sqlite_file_path(database_url: str) -> Path | None:
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return None

    raw_path = database_url[len(prefix):]
    if raw_path == ":memory:":
        return None

    return Path(raw_path)


def ensure_database_file(database_url: str) -> None:
    db_path = _sqlite_file_path(database_url)
    if db_path is None:
        return

    db_path.parent.mkdir(parents=True, exist_ok=True)


def build_engine(database_url: str):
    engine_kwargs = {"future": True}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    ensure_database_file(database_url)
    return create_engine(database_url, **engine_kwargs)


engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
