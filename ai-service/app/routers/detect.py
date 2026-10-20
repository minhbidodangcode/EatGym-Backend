"""
Food detection router.

POST /api/v1/detect  – upload an image and get YOLOv8 detections back.
"""

import logging
import time

from fastapi import APIRouter, File, UploadFile, HTTPException, Query

from app.services.yolo_service import predict

logger = logging.getLogger("eatgym-ai.detect")

router = APIRouter(tags=["Detection"])


@router.post("/detect")
async def detect_food(
    file: UploadFile = File(..., description="Food image (JPEG/PNG)"),
    confidence: float = Query(
        0.25,
        ge=0.01,
        le=1.0,
        description="Minimum detection confidence threshold",
    ),
):
    """
    Upload a food image and receive a list of detected food items.

    Each item contains:
    - **class_name**: tên món ăn
    - **confidence**: độ tin cậy (0‑1)
    - **bbox**: tọa độ bounding box [x1, y1, x2, y2]
    """
    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {file.content_type}. Use JPEG, PNG, or WebP.",
        )

    request_start = time.perf_counter()
    # Read at most one byte beyond the limit so oversized uploads do not fill memory.
    max_size = 10 * 1024 * 1024
    image_bytes = await file.read(max_size + 1)
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Limit file size (10 MB)
    if len(image_bytes) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(image_bytes)} bytes). Max {max_size} bytes.",
        )

    # Run inference
    logger.info(
        "Detecting food in uploaded image (%s, %.1f KB)",
        file.filename,
        len(image_bytes) / 1024,
    )
    start = time.perf_counter()

    try:
        detections = predict(image_bytes, conf=confidence)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info("Detection complete: %d items in %.0f ms", len(detections), elapsed_ms)

    return {
        "filename": file.filename,
        "detections": detections,
        "count": len(detections),
        "inference_ms": round(elapsed_ms, 1),
        "request_ms": round((time.perf_counter() - request_start) * 1000, 1),
    }
