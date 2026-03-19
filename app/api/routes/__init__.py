from fastapi import APIRouter

from app.api.routes.config import router as config_router
from app.api.routes.domain import router as domain_router
from app.api.routes.gui import router as gui_router
from app.api.routes.status import router as status_router

router = APIRouter()
router.include_router(domain_router)
router.include_router(config_router)
router.include_router(gui_router)
router.include_router(status_router)
