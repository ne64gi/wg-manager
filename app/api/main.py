from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core import settings
from app.db import SessionLocal
from app.services import bootstrap_login_user, init_db

app = FastAPI(title="WireGuard Control Plane", version="0.1.0")
if settings.cors_allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.include_router(router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with SessionLocal() as session:
        bootstrap_login_user(session)
