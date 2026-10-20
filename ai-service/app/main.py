"""
EatGym AI Service – FastAPI entry point.

Exposes endpoints for food image detection using YOLOv8.
Binds to 0.0.0.0 so the service is reachable from other
machines on the LAN (and from the Docker host / other containers).
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import detect
from app.services.yolo_service import warm_model


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Weight loading is kept off the first user's request. If weights are absent,
    # keep the API alive so /health works and /detect can return its 503 response.
    try:
        warm_model()
    except Exception:
        logger.exception("Could not warm the food detection model at startup")
    yield

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("eatgym-ai")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EatGym AI Service",
    description="YOLOv8‑powered food detection API for the EatGym platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – cho phép Node.js API và mobile app gọi tới
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Production: thu hẹp lại theo domain thật
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(detect.router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "eatgym-ai"}


# ---------------------------------------------------------------------------
# Run with: uvicorn app.main:app --host 0.0.0.0 --port 8000
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("AI_PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",       # QUAN TRỌNG: mở cho LAN
        port=port,
        reload=os.getenv("ENV", "production") != "production",
    )
