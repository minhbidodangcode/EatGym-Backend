"""
YOLOv8 food detection service.

Loads the custom-trained YOLOv8 weights once at startup
and exposes a prediction function used by the router.
"""

import logging
import os
import threading
from pathlib import Path

from ultralytics import YOLO

logger = logging.getLogger("eatgym-ai.yolo")

# ---------------------------------------------------------------------------
# Model singleton – loaded once when the module is first imported
# ---------------------------------------------------------------------------
_MODEL_PATH = os.getenv(
    "YOLO_MODEL_PATH",
    str(Path(__file__).resolve().parents[2] / "models" / "yolov8_food.pt"),
)

_model: YOLO | None = None
_model_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_model() -> YOLO:
    """Return the cached YOLO model, loading it on first call."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info("Loading YOLOv8 model from %s", _MODEL_PATH)
                if not Path(_MODEL_PATH).exists():
                    raise FileNotFoundError(
                        f"Model file not found: {_MODEL_PATH}. "
                        "Place your yolov8_food.pt in the ai-service/models/ directory."
                    )
                _model = YOLO(_MODEL_PATH)
                logger.info("Model loaded successfully (%d classes).", len(_model.names))
    return _model


def predict(image_bytes: bytes, conf: float = 0.25):
    """
    Run YOLOv8 inference on raw image bytes.

    Returns a list of detected items:
        [
            {
                "class_id": 0,
                "class_name": "rice",
                "confidence": 0.93,
                "bbox": [x1, y1, x2, y2]
            },
            ...
        ]
    """
    import io
    from PIL import Image

    model = get_model()
    with Image.open(io.BytesIO(image_bytes)) as source:
        source.thumbnail((1280, 1280), Image.Resampling.BILINEAR)
        image = source.convert("RGB")

    image_size = int(os.getenv("YOLO_IMAGE_SIZE", "640"))
    with _inference_lock:
        results = model.predict(source=image, conf=conf, imgsz=image_size, verbose=False, stream=False)

    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            detections.append(
                {
                    "class_id": cls_id,
                    "class_name": model.names[cls_id],
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox": [round(float(c), 2) for c in box.xyxy[0].tolist()],
                }
            )

    return detections


def warm_model() -> None:
    """Load weights during application startup so the first request avoids disk/model initialization."""
    from PIL import Image

    model = get_model()
    warmup_size = int(os.getenv("YOLO_IMAGE_SIZE", "640"))
    with _inference_lock:
        model.predict(source=Image.new("RGB", (warmup_size, warmup_size)), imgsz=warmup_size, verbose=False, stream=False)
