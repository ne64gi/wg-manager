from fastapi import FastAPI

from app.api.routes import router
from app.db import SessionLocal
from app.services import bootstrap_login_user, init_db

app = FastAPI(title="WireGuard Control Plane", version="0.1.0")
app.include_router(router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with SessionLocal() as session:
        bootstrap_login_user(session)
