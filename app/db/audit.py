from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core import settings
from app.db.main import build_engine


class AuditBase(DeclarativeBase):
    pass


audit_engine = build_engine(settings.log_database_url)
AuditSessionLocal = sessionmaker(bind=audit_engine, autoflush=False, autocommit=False)


def get_log_session():
    session = AuditSessionLocal()
    try:
        yield session
    finally:
        session.close()
