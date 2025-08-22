from fastapi import APIRouter
from .review_api import router as review_router

router = APIRouter()
router.include_router(review_router) 