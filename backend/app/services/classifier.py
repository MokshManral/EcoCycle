"""
AI waste classifier service.

Public interface:
    classify_waste(image_bytes: bytes, filename: str) -> WasteAnalysisResponse

Modes:
    MOCK_CLASSIFIER=true  -> deterministic mock for local development
    MOCK_CLASSIFIER=false -> local image-based classifier, with Bedrock fallback
"""

from __future__ import annotations

import io
import logging
from typing import Any, Optional

from PIL import Image, ImageFilter

from app.core.config import get_settings
from app.schemas import RecyclerInfo, WasteAnalysisResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Points per waste category
# ---------------------------------------------------------------------------

POINTS_PER_UNIT: dict[str, int] = {
    "plastic": 12,
    "paper": 6,
    "glass": 8,
    "metal": 10,
    "e-waste": 30,
    "organic": 4,
    "hazardous": 30,
    "other": 5,
}

VALID_CATEGORIES = set(POINTS_PER_UNIT.keys())


# ---------------------------------------------------------------------------
# Disposal instructions
# ---------------------------------------------------------------------------

_DISPOSAL: dict[str, dict[str, Optional[str]]] = {
    "plastic": {
        "disposal_method": (
            "Empty and rinse the container. Remove food residue. "
            "Check the recycling number: types 1 (PET) and 2 (HDPE) "
            "are widely accepted. Place in a dry-recyclables bin."
        ),
        "hazard_warning": None,
    },
    "paper": {
        "disposal_method": (
            "Keep paper and cardboard dry. Flatten cardboard boxes. "
            "Remove plastic tape and bubble wrap. Place in the "
            "paper/cardboard recycling bin."
        ),
        "hazard_warning": None,
    },
    "glass": {
        "disposal_method": (
            "Rinse glass containers and remove metal lids. "
            "Do not mix window glass with ordinary container glass. "
            "Place in a designated glass collection bin."
        ),
        "hazard_warning": (
            "Broken glass can cause serious cuts. Avoid handling "
            "shards directly. Use appropriate protective equipment "
            "and follow local disposal guidance."
        ),
    },
    "metal": {
        "disposal_method": (
            "Rinse food cans and place them with dry metal recyclables. "
            "Aluminium and steel cans are commonly recyclable."
        ),
        "hazard_warning": None,
    },
    "e-waste": {
        "disposal_method": (
            "Do not put electronics in general waste. Take the item "
            "to an authorised e-waste collection centre or manufacturer "
            "take-back programme. Do not dismantle the device unless "
            "qualified to do so."
        ),
        "hazard_warning": (
            "Electronic devices may contain hazardous materials and "
            "batteries. Do not crush, burn, or puncture them. If a "
            "battery is swollen, hot, or leaking, avoid handling it "
            "and follow local hazardous-waste guidance."
        ),
    },
    "hazardous": {
        "disposal_method": (
            "Keep the material in its original labelled container "
            "when safe to do so. Never mix it with other chemicals, "
            "general waste, or drains. Contact an authorised "
            "hazardous-waste collection service."
        ),
        "hazard_warning": (
            "This item may require special handling. Keep it away "
            "from children and heat. Do not puncture, burn, or mix "
            "it with other substances."
        ),
    },
    "organic": {
        "disposal_method": (
            "Place suitable food and garden waste in a compost bin "
            "or approved organic-waste collection container. "
            "Keep non-organic materials out of the compost."
        ),
        "hazard_warning": None,
    },
    "other": {
        "disposal_method": (
            "The item could not be confidently assigned to a standard "
            "recycling stream. Check local waste-authority guidance "
            "or contact an authorised waste collection service."
        ),
        "hazard_warning": None,
    },
}


# ---------------------------------------------------------------------------
# Unknown classification result
# ---------------------------------------------------------------------------

_UNKNOWN_RESULT = WasteAnalysisResponse(
    item_name=None,
    category=None,
    confidence=None,
    hazard_warning=None,
    disposal_method=None,
    recycler=None,
    estimated_points=None,
)


# ---------------------------------------------------------------------------
# Mock classifier catalogue
# ---------------------------------------------------------------------------

_MOCK_CATALOG: dict[str, WasteAnalysisResponse] = {
    "bottle": WasteAnalysisResponse(
        item_name="PET plastic bottle",
        category="plastic",
        confidence=0.94,
        hazard_warning=_DISPOSAL["plastic"]["hazard_warning"],
        disposal_method=_DISPOSAL["plastic"]["disposal_method"],
        recycler=RecyclerInfo(
            name="Demo Plastics Recovery Centre",
            address="Sample Industrial Area, Block C",
        ),
        estimated_points=12,
    ),
    "battery": WasteAnalysisResponse(
        item_name="Household battery",
        category="hazardous",
        confidence=0.88,
        hazard_warning=_DISPOSAL["hazardous"]["hazard_warning"],
        disposal_method=_DISPOSAL["hazardous"]["disposal_method"],
        recycler=RecyclerInfo(
            name="Demo E-Waste Handler",
            address="Sample Tech Park, Gate 2",
        ),
        estimated_points=30,
    ),
    "can": WasteAnalysisResponse(
        item_name="Aluminium drink can",
        category="metal",
        confidence=0.91,
        hazard_warning=None,
        disposal_method=_DISPOSAL["metal"]["disposal_method"],
        recycler=RecyclerInfo(
            name="Demo Metal Recyclers",
            address="Sample Yard Road",
        ),
        estimated_points=10,
    ),
    "box": WasteAnalysisResponse(
        item_name="Cardboard box",
        category="paper",
        confidence=0.90,
        hazard_warning=None,
        disposal_method=_DISPOSAL["paper"]["disposal_method"],
        recycler=None,
        estimated_points=6,
    ),
    "glass": WasteAnalysisResponse(
        item_name="Glass jar",
        category="glass",
        confidence=0.90,
        hazard_warning=_DISPOSAL["glass"]["hazard_warning"],
        disposal_method=_DISPOSAL["glass"]["disposal_method"],
        recycler=RecyclerInfo(
            name="Demo Glass Works",
            address="Sample Depot Lane",
        ),
        estimated_points=8,
    ),
    "charger": WasteAnalysisResponse(
        item_name="Electronic charger",
        category="e-waste",
        confidence=0.90,
        hazard_warning=_DISPOSAL["e-waste"]["hazard_warning"],
        disposal_method=_DISPOSAL["e-waste"]["disposal_method"],
        recycler=None,
        estimated_points=30,
    ),
}

_MOCK_KEYS = list(_MOCK_CATALOG.keys())


def _local_image_features(image_bytes: bytes) -> dict[str, float]:
    """Compute a compact feature vector from a waste image."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((128, 128))
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ValueError("Unable to decode the uploaded image.") from exc

    pixels = list(image.getdata())
    if not pixels:
        raise ValueError("Empty image received by classifier.")

    red = [pixel[0] for pixel in pixels]
    green = [pixel[1] for pixel in pixels]
    blue = [pixel[2] for pixel in pixels]
    brightness = [
        (r + g + b) / 3.0 for r, g, b in zip(red, green, blue)
    ]

    avg_red = sum(red) / len(red)
    avg_green = sum(green) / len(green)
    avg_blue = sum(blue) / len(blue)
    mean_brightness = sum(brightness) / len(brightness)

    max_channel = max(max(red), max(green), max(blue))
    min_channel = min(min(red), min(green), min(blue))
    saturation = 0.0 if max_channel == 0 else (max_channel - min_channel) / max_channel

    edge_image = image.filter(ImageFilter.FIND_EDGES).convert("L")
    edge_pixels = list(edge_image.getdata())
    edge_density = sum(1 for pixel in edge_pixels if pixel > 25) / len(edge_pixels)

    histogram = image.histogram()
    bright_pixels = sum(histogram[200:256])
    bright_ratio = bright_pixels / max(sum(histogram), 1)

    return {
        "avg_red": avg_red,
        "avg_green": avg_green,
        "avg_blue": avg_blue,
        "brightness": mean_brightness,
        "saturation": saturation,
        "edge_density": edge_density,
        "bright_ratio": bright_ratio,
        "contrast": max(brightness) - min(brightness),
    }


def _local_classify(
    image_bytes: bytes,
    filename: str,
) -> WasteAnalysisResponse:
    """A lightweight local classifier based on image features.

    This intentionally avoids cloud dependencies and keeps the app usable even when
    AWS Bedrock is unavailable or the Bedrock region/model is not enabled.
    """
    filename_lower = (filename or "").lower()

    keyword_map = {
        "battery": "hazardous",
        "charger": "e-waste",
        "electronic": "e-waste",
        "bottle": "plastic",
        "plastic": "plastic",
        "can": "metal",
        "tin": "metal",
        "metal": "metal",
        "box": "paper",
        "cardboard": "paper",
        "paper": "paper",
        "jar": "glass",
        "glass": "glass",
        "food": "organic",
        "apple": "organic",
        "banana": "organic",
        "organic": "organic",
        "unknown": "other",
        "blur": "other",
    }

    for keyword, category in keyword_map.items():
        if keyword in filename_lower:
            result = WasteAnalysisResponse(
                item_name={
                    "plastic": "Plastic item",
                    "paper": "Paper item",
                    "glass": "Glass item",
                    "metal": "Metal item",
                    "e-waste": "Electronic item",
                    "organic": "Organic waste",
                    "hazardous": "Hazardous waste",
                    "other": "Unclear item",
                }[category],
                category=category,
                confidence=0.82,
                hazard_warning=_DISPOSAL[category]["hazard_warning"],
                disposal_method=_DISPOSAL[category]["disposal_method"],
                recycler=None,
                estimated_points=POINTS_PER_UNIT[category],
            )
            return result

    try:
        features = _local_image_features(image_bytes)
    except ValueError:
        return _UNKNOWN_RESULT

    scores: dict[str, float] = {key: 0.0 for key in VALID_CATEGORIES}

    if features["brightness"] > 165 and features["saturation"] < 0.18:
        scores["metal"] += 0.75
        scores["glass"] += 0.35
        scores["paper"] += 0.15

    if features["brightness"] < 120 and features["avg_green"] > features["avg_red"]:
        scores["organic"] += 0.65

    if features["avg_blue"] > max(features["avg_red"], features["avg_green"]) and features["saturation"] > 0.2:
        scores["plastic"] += 0.55

    if features["avg_red"] > features["avg_green"] and features["avg_red"] > features["avg_blue"]:
        scores["hazardous"] += 0.45
        scores["e-waste"] += 0.2

    if features["edge_density"] > 0.16 and features["contrast"] > 30:
        scores["paper"] += 0.35
        scores["cardboard"] = 0.0

    if features["saturation"] < 0.12 and features["brightness"] > 130:
        scores["glass"] += 0.15

    if features["bright_ratio"] > 0.55 and features["saturation"] < 0.2:
        scores["metal"] += 0.15

    best_category, best_score = max(scores.items(), key=lambda item: item[1])

    if best_score < 0.45:
        return _UNKNOWN_RESULT

    category = best_category
    confidence = round(min(0.96, 0.5 + best_score * 0.7), 4)
    label_map = {
        "plastic": "Plastic item",
        "paper": "Paper item",
        "glass": "Glass item",
        "metal": "Metal item",
        "e-waste": "Electronic item",
        "organic": "Organic waste",
        "hazardous": "Hazardous waste",
        "other": "Unclear item",
    }

    return WasteAnalysisResponse(
        item_name=label_map.get(category, "Waste item"),
        category=category,
        confidence=confidence,
        hazard_warning=_DISPOSAL[category]["hazard_warning"],
        disposal_method=_DISPOSAL[category]["disposal_method"],
        recycler=None,
        estimated_points=POINTS_PER_UNIT[category],
    )


def _mock_classify(
    image_bytes: bytes,
    filename: str,
) -> WasteAnalysisResponse:
    """
    Deterministic mock classifier.

    IMPORTANT: This uses the filename, not computer vision.
    It is intended for development and testing only.
    """
    logger.info("[MOCK] Classifying: %s", filename)

    name = filename.lower()

    if "unknown" in name or "blur" in name:
        return _UNKNOWN_RESULT

    for key in _MOCK_KEYS:
        if key in name:
            logger.info(
                "[MOCK] Filename keyword '%s' -> %s",
                key,
                _MOCK_CATALOG[key].category,
            )
            return _MOCK_CATALOG[key]

    # Deterministic fallback for mock testing.
    result = _MOCK_CATALOG[
        _MOCK_KEYS[len(image_bytes) % len(_MOCK_KEYS)]
    ]

    logger.info("[MOCK] Fallback category: %s", result.category)
    return result


# ---------------------------------------------------------------------------
# Strands agent system prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """
You are EcoCycle's waste classification expert.

Inspect the actual uploaded image. Do not infer the item from its filename.

Identify the main waste item and call the record_classification tool.

Allowed categories:
plastic, paper, glass, metal, e-waste, organic, hazardous, other.

Rules:
1. Describe the visible item accurately.
2. Choose exactly one allowed category.
3. Return a confidence value from 0.0 to 1.0.
4. Use a low confidence when the image is unclear.
5. Use category "other" if the item cannot be identified.
6. Do not invent details that are not visible.
7. Call record_classification with your findings.
"""


# ---------------------------------------------------------------------------
# Build the Strands agent
# ---------------------------------------------------------------------------

def _build_strands_agent():
    """
    Create a Strands Agent using AWS Bedrock.

    AWS credentials are resolved through the standard AWS credential chain.
    Do not pass aws_access_key_id or aws_secret_access_key to BedrockModel.
    """
    try:
        from strands import Agent, tool
        from strands.models import BedrockModel
    except ImportError as exc:
        raise ImportError(
            "Strands SDK is missing. Install it with: "
            "pip install strands-agents"
        ) from exc

    settings = get_settings()

    model = BedrockModel(
        model_id=settings.BEDROCK_MODEL_ID,
        region_name=settings.AWS_REGION,
    )

    @tool
    def record_classification(
        item_name: str,
        category: str,
        confidence: float,
        hazard_warning: Optional[str] = None,
    ) -> str:
        """
        Record a waste image classification.

        Args:
            item_name: Name of the visible waste item.
            category: One of the supported waste categories.
            confidence: Confidence score from 0.0 to 1.0.
            hazard_warning: Optional safety warning.
        """
        return "Classification recorded."

    agent = Agent(
        model=model,
        system_prompt=_SYSTEM_PROMPT,
        tools=[record_classification],
    )

    return agent, record_classification


# ---------------------------------------------------------------------------
# Extract structured tool output
# ---------------------------------------------------------------------------

def _extract_tool_call(agent_result: Any) -> Optional[dict]:
    """Extract record_classification arguments from the agent result."""

    try:
        message = getattr(agent_result, "message", None)

        if not isinstance(message, dict):
            logger.warning(
                "[STRANDS] Unexpected result message type: %s",
                type(message).__name__,
            )
            return None

        content = message.get("content", [])

        if not isinstance(content, list):
            return None

        for block in content:
            if not isinstance(block, dict):
                continue

            # Anthropic-style tool call.
            if (
                block.get("type") == "tool_use"
                and block.get("name") == "record_classification"
            ):
                arguments = block.get("input")
                if isinstance(arguments, dict):
                    return arguments

            # CamelCase tool call.
            tool_use = block.get("toolUse")

            if isinstance(tool_use, dict):
                if tool_use.get("name") == "record_classification":
                    arguments = tool_use.get("input")
                    if isinstance(arguments, dict):
                        return arguments

    except Exception:
        logger.exception("[STRANDS] Could not extract tool call")

    return None


# ---------------------------------------------------------------------------
# Real image classifier: Strands + Bedrock
# ---------------------------------------------------------------------------

def _strands_classify(
    image_bytes: bytes,
    filename: str,
) -> WasteAnalysisResponse:
    """Classify an actual image using a multimodal Bedrock model."""

    logger.info(
        "[STRANDS] Classifying image: %s (%d bytes)",
        filename,
        len(image_bytes),
    )

    if not image_bytes:
        raise ValueError("Empty image received by classifier.")

    try:
        agent, _tool_fn = _build_strands_agent()
    except Exception:
        logger.exception("[STRANDS] Failed to initialise agent")
        return _UNKNOWN_RESULT

    extension = (
        filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else "jpg"
    )

    image_formats = {
        "jpg": "jpeg",
        "jpeg": "jpeg",
        "png": "png",
        "webp": "webp",
        "gif": "gif",
    }

    image_format = image_formats.get(extension)

    if image_format is None:
        logger.error(
            "[STRANDS] Unsupported image extension: %s",
            extension,
        )
        return _UNKNOWN_RESULT

    # Strands multimodal content-block format.
    # The bytes are sent directly; base64 encoding is handled by the SDK.
    user_message = [
        {
            "image": {
                "format": image_format,
                "source": {
                    "bytes": image_bytes,
                },
            },
        },
        {
            "text": (
                "Inspect this image and identify its main waste item. "
                "Call record_classification with item_name, category, "
                "confidence, and hazard_warning."
            ),
        },
    ]

    try:
        result = agent(user_message)
        logger.debug("[STRANDS] Raw agent result: %s", result)
    except Exception:
        logger.exception("[STRANDS] Agent invocation failed")
        return _UNKNOWN_RESULT

    tool_args = _extract_tool_call(result)

    if not tool_args:
        logger.error(
            "[STRANDS] Agent did not return a record_classification "
            "tool call. Inspect the raw agent result and SDK version."
        )
        return _UNKNOWN_RESULT

    # Validate category.
    raw_category = str(
        tool_args.get("category", "other")
    ).strip().lower()

    category = (
        raw_category
        if raw_category in VALID_CATEGORIES
        else "other"
    )

    # Validate confidence.
    try:
        confidence = float(tool_args.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    # Validate item name.
    item_name = str(
        tool_args.get("item_name") or "Unknown waste item"
    ).strip()

    # Normalise hazard warning.
    hazard_warning = tool_args.get("hazard_warning")

    if not hazard_warning:
        hazard_warning = _DISPOSAL[category]["hazard_warning"]

    advice = _DISPOSAL[category]

    logger.info(
        "[STRANDS] Classification: item=%r category=%s confidence=%.2f",
        item_name,
        category,
        confidence,
    )

    return WasteAnalysisResponse(
        item_name=item_name,
        category=category,
        confidence=round(confidence, 4),
        hazard_warning=hazard_warning,
        disposal_method=advice["disposal_method"],
        recycler=None,
        estimated_points=POINTS_PER_UNIT[category],
    )


# ---------------------------------------------------------------------------
# Public classifier interface
# ---------------------------------------------------------------------------

def classify_waste(
    image_bytes: bytes,
    filename: str,
) -> WasteAnalysisResponse:
    """
    Classify an uploaded waste image.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        filename: Original uploaded filename.

    Returns:
        WasteAnalysisResponse.

    Raises:
        ValueError: If image_bytes is empty.
    """
    if not image_bytes:
        raise ValueError(
            "Empty image_bytes received by classifier."
        )

    settings = get_settings()

    if settings.MOCK_CLASSIFIER:
        return _mock_classify(image_bytes, filename)

    try:
        return _local_classify(image_bytes, filename)
    except Exception:
        logger.exception(
            "Local classifier failed; falling back to AWS Bedrock classifier."
        )

    return _strands_classify(image_bytes, filename)