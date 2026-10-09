"""
AI Classifier Service — powered by Strands Agents SDK + AWS Bedrock.

Public interface (route handlers never call anything else):

    classify_waste(image_bytes: bytes, filename: str) -> WasteAnalysisResponse

─────────────────────────────────────────────────────────────────────────────
Modes
─────────────────────────────────────────────────────────────────────────────
MOCK_CLASSIFIER=true  (default)
    Keyword-based deterministic mock.  No AWS credentials needed.
    Use for local development and CI tests.

MOCK_CLASSIFIER=false
    Uses the Strands Agents SDK backed by AWS Bedrock (Claude Opus 4.8).
    The agent receives the image and calls a structured Python tool to
    return its classification — giving us type-safe, normalized output.

─────────────────────────────────────────────────────────────────────────────
Why Strands Agents?
─────────────────────────────────────────────────────────────────────────────
Strands Agents SDK (https://github.com/strands-agents/sdk-python) is an
open-source (Apache 2.0) framework from AWS for building model-driven agents.

  • Model-first: agent = model + system_prompt + tools
  • AWS Bedrock by default — Claude Opus is multimodal (handles image bytes)
  • Tool use enforces structured output — no fragile string parsing
  • Runs in-process — no hosted control plane, no extra infra

─────────────────────────────────────────────────────────────────────────────
Model: Claude Opus 4.8 on AWS Bedrock
─────────────────────────────────────────────────────────────────────────────
Model IDs:
  anthropic.claude-opus-4-8          ← in-region (default)
  us.anthropic.claude-opus-4-8       ← US geo cross-region failover
  anthropic.claude-opus-4-7          ← previous version

⚠  Opus 4.7+ BREAKING CHANGE:
  temperature, top_p, and top_k are no longer supported.
  Passing them causes a 400 error. This code never passes them.

Docs: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html

─────────────────────────────────────────────────────────────────────────────
How it works for waste classification
─────────────────────────────────────────────────────────────────────────────
1. Image bytes are base64-encoded and sent as a multimodal Bedrock message.
2. The Strands agent inspects the image with Claude Opus's vision capability.
3. The agent is given ONE tool: `record_classification`.
4. To finish its task the agent MUST call that tool — this is the structured
   output mechanism. Claude cannot just reply with text.
5. The tool's arguments are the classification fields (category, confidence,
   item_name, hazard_warning).
6. We capture those arguments and build the WasteAnalysisResponse.

─────────────────────────────────────────────────────────────────────────────
AWS services used
─────────────────────────────────────────────────────────────────────────────
  Amazon Bedrock  — hosts Claude Opus 4.8, invoked via Strands / boto3
─────────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Any, Optional

from app.core.config import get_settings
from app.schemas import RecyclerInfo, WasteAnalysisResponse

logger = logging.getLogger(__name__)

# ── Points per unit — single source of truth (mirrors frontend) ───────────────
POINTS_PER_UNIT: dict[str, int] = {
    "plastic":   12,
    "paper":      6,
    "glass":      8,
    "metal":     10,
    "e-waste":   30,
    "organic":    4,
    "hazardous": 30,
    "other":      5,
}

VALID_CATEGORIES = set(POINTS_PER_UNIT.keys())

# ── Disposal advice per category — no second AI call needed ───────────────────
_DISPOSAL: dict[str, dict[str, Optional[str]]] = {
    "plastic": {
        "disposal_method": (
            "Empty and rinse the container. Remove food residue. "
            "Check the recycling number — types 1 (PET) and 2 (HDPE) are widely accepted. "
            "Flatten bottles to save space and place in a dry-recyclables bin."
        ),
        "hazard_warning": None,
    },
    "paper": {
        "disposal_method": (
            "Keep paper and cardboard dry — wet paper cannot be recycled. "
            "Flatten cardboard boxes. Remove plastic tape and bubble wrap. "
            "Place in the paper/cardboard recycling bin."
        ),
        "hazard_warning": None,
    },
    "glass": {
        "disposal_method": (
            "Rinse the container. Remove the metal lid (recycle separately). "
            "Do not mix with window glass or ceramics. "
            "Place in a designated glass collection bin."
        ),
        "hazard_warning": (
            "Handle broken glass with thick gloves. "
            "Wrap shards in newspaper before disposal."
        ),
    },
    "metal": {
        "disposal_method": (
            "Rinse food cans. Crush lightly to save space. "
            "Aluminium and steel cans are both recyclable. "
            "Place with other dry metal recyclables."
        ),
        "hazard_warning": None,
    },
    "e-waste": {
        "disposal_method": (
            "Do not put electronics in general waste — they contain toxic materials. "
            "Remove and separate the battery if possible. "
            "Hand over to a certified e-waste collector or manufacturer take-back scheme."
        ),
        "hazard_warning": (
            "E-waste contains lead, mercury, and cadmium. "
            "Never incinerate or crush electronics."
        ),
    },
    "hazardous": {
        "disposal_method": (
            "Store in the original labelled container in a cool, dry place. "
            "Never mix with general waste or pour down the drain. "
            "Take to a household hazardous waste collection point."
        ),
        "hazard_warning": (
            "This item requires special handling. Keep away from children and heat. "
            "Do not puncture, incinerate, or mix with other chemicals."
        ),
    },
    "organic": {
        "disposal_method": (
            "Place in a compost bin or food-waste collection. "
            "Avoid mixing with non-organic materials. "
            "Composted organic waste enriches soil and reduces landfill methane."
        ),
        "hazard_warning": None,
    },
    "other": {
        "disposal_method": (
            "This item could not be placed in a standard recycling stream. "
            "Check your local waste authority's guidelines. "
            "Some items may be accepted at general waste or special collection events."
        ),
        "hazard_warning": None,
    },
}

# ── Unknown / low-confidence sentinel ─────────────────────────────────────────
_UNKNOWN_RESULT = WasteAnalysisResponse(
    item_name=None, category=None, confidence=None,
    hazard_warning=None, disposal_method=None,
    recycler=None, estimated_points=None,
)

# ── Mock catalogue (mirrors frontend mock/waste.js) ───────────────────────────
_MOCK_CATALOG: dict[str, WasteAnalysisResponse] = {
    "bottle":  WasteAnalysisResponse(
        item_name="PET plastic bottle", category="plastic", confidence=0.94,
        hazard_warning=_DISPOSAL["plastic"]["hazard_warning"],
        disposal_method=_DISPOSAL["plastic"]["disposal_method"],
        recycler=RecyclerInfo(name="Demo Plastics Recovery Centre", address="Sample Industrial Area, Block C"),
        estimated_points=12,
    ),
    "battery": WasteAnalysisResponse(
        item_name="Household battery", category="hazardous", confidence=0.88,
        hazard_warning=_DISPOSAL["hazardous"]["hazard_warning"],
        disposal_method=_DISPOSAL["hazardous"]["disposal_method"],
        recycler=RecyclerInfo(name="Demo E-Waste Handler", address="Sample Tech Park, Gate 2"),
        estimated_points=30,
    ),
    "can":     WasteAnalysisResponse(
        item_name="Aluminium drink can", category="metal", confidence=0.91,
        hazard_warning=None, disposal_method=_DISPOSAL["metal"]["disposal_method"],
        recycler=RecyclerInfo(name="Demo Metal Recyclers", address="Sample Yard Road"),
        estimated_points=10,
    ),
    "box":     WasteAnalysisResponse(
        item_name="Cardboard box", category="paper", confidence=0.52,
        hazard_warning=None, disposal_method=_DISPOSAL["paper"]["disposal_method"],
        recycler=None, estimated_points=6,
    ),
    "glass":   WasteAnalysisResponse(
        item_name="Glass jar", category="glass", confidence=0.90,
        hazard_warning=_DISPOSAL["glass"]["hazard_warning"],
        disposal_method=_DISPOSAL["glass"]["disposal_method"],
        recycler=RecyclerInfo(name="Demo Glass Works", address="Sample Depot Lane"),
        estimated_points=8,
    ),
}
_MOCK_KEYS = list(_MOCK_CATALOG.keys())


# ─────────────────────────────────────────────────────────────────────────────
# MOCK CLASSIFIER
# ─────────────────────────────────────────────────────────────────────────────

def _mock_classify(image_bytes: bytes, filename: str) -> WasteAnalysisResponse:
    """Deterministic keyword-based mock — no AWS calls."""
    logger.info("[MOCK] Classifying: %s", filename)
    name = filename.lower()
    if "unknown" in name or "blur" in name:
        return _UNKNOWN_RESULT
    for key in _MOCK_KEYS:
        if key in name:
            logger.info("[MOCK] Keyword match '%s' → %s", key, _MOCK_CATALOG[key].category)
            return _MOCK_CATALOG[key]
    # Size-based deterministic fallback
    result = _MOCK_CATALOG[_MOCK_KEYS[len(image_bytes) % len(_MOCK_KEYS)]]
    logger.info("[MOCK] Fallback → %s", result.category)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STRANDS AGENT CLASSIFIER
# ─────────────────────────────────────────────────────────────────────────────

# System prompt — tells the agent its job and forces it to use the tool
_SYSTEM_PROMPT = """You are EcoLoop's waste classification expert.

Your ONLY job is to analyze the uploaded image and call the
`record_classification` tool with your findings.

Instructions:
1. Look carefully at the image and identify the main waste item.
2. Choose ONE category from this exact list:
   plastic | paper | glass | metal | e-waste | organic | hazardous | other
3. Estimate your confidence as a number between 0.0 and 1.0.
4. If the image is unclear, blurry, or contains no identifiable waste,
   set category to "other" and confidence below 0.5.
5. You MUST call record_classification — do not reply with plain text.
"""


def _build_strands_agent():
    """
    Build and return a Strands Agent configured with Bedrock (Claude Opus 4.8).

    The agent has one tool: record_classification.
    Claude must call it to complete the task — structured output, no string parsing.

    ⚠  Opus 4.7+ does NOT support temperature, top_p, or top_k.
       BedrockModel is constructed without those params — never add them here.
    """
    try:
        from strands import Agent, tool
        from strands.models import BedrockModel
    except ImportError:
        raise ImportError(
            "strands-agents is not installed. "
            "Run: pip install strands-agents strands-agents-tools"
        )

    settings = get_settings()

    # ── Build the Bedrock model provider ──────────────────────────────────────
    bedrock_kwargs: dict[str, Any] = {
        "model_id": settings.BEDROCK_MODEL_ID,
        "region_name": settings.AWS_REGION,
    }
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        bedrock_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        bedrock_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    model = BedrockModel(**bedrock_kwargs)

    # ── Define the structured output tool ─────────────────────────────────────
    # Strands uses the @tool decorator to expose Python functions as agent tools.
    # The type annotations become the tool's JSON schema automatically.

    @tool
    def record_classification(
        item_name: str,
        category: str,
        confidence: float,
        hazard_warning: Optional[str] = None,
    ) -> str:
        """
        Record the waste classification result.

        Call this tool when you have identified the waste item in the image.

        Args:
            item_name: Human-readable name of the identified item (e.g. "PET plastic bottle").
            category: Waste category — must be one of:
                      plastic | paper | glass | metal | e-waste | organic | hazardous | other
            confidence: Your confidence score between 0.0 (uncertain) and 1.0 (certain).
            hazard_warning: Optional safety warning for hazardous items. Null if not applicable.
        """
        # This function's return value is shown to the agent as tool output.
        # We don't use it — we capture the call arguments in the callback below.
        return "Classification recorded."

    return Agent(
        model=model,
        system_prompt=_SYSTEM_PROMPT,
        tools=[record_classification],
    ), record_classification


def _extract_tool_call(agent_result: Any) -> Optional[dict]:
    """
    Pull the record_classification arguments out of the Strands agent result.

    Strands exposes tool use via result.message["content"], which is a list
    of content blocks. We look for a toolUse block with the right name.
    """
    try:
        content = agent_result.message.get("content", [])
        for block in content:
            if block.get("type") == "tool_use" and block.get("name") == "record_classification":
                return block.get("input", {})
        # Also check stop_reason / tool_results in the message chain
        # Some Strands versions surface the final tool call differently
        if hasattr(agent_result, "stop_reason") and agent_result.stop_reason == "tool_use":
            for block in content:
                if "toolUse" in block:
                    tu = block["toolUse"]
                    if tu.get("name") == "record_classification":
                        return tu.get("input", {})
    except Exception as exc:
        logger.debug("[STRANDS] Could not parse tool call from result: %s", exc)
    return None


def _strands_classify(image_bytes: bytes, filename: str) -> WasteAnalysisResponse:
    """
    Classify waste using the Strands Agents SDK + AWS Bedrock (Claude).

    The agent is given the image as a base64-encoded multimodal message.
    It must call record_classification with structured fields.
    We capture those fields and build a WasteAnalysisResponse.
    """
    logger.info("[STRANDS] Classifying image: %s (%d bytes)", filename, len(image_bytes))

    try:
        agent, _tool_fn = _build_strands_agent()
    except ImportError as exc:
        logger.error("[STRANDS] %s", exc)
        return _UNKNOWN_RESULT
    except Exception as exc:
        logger.error("[STRANDS] Failed to build agent: %s", exc)
        return _UNKNOWN_RESULT

    # Detect MIME type from filename for the multimodal message
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpeg"
    mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}
    media_type = f"image/{mime_map.get(ext, 'jpeg')}"

    # Encode image as base64 for the multimodal Bedrock message
    image_b64 = base64.standard_b64encode(image_bytes).decode()

    # Build the multimodal user message
    # Strands accepts a list of content blocks matching the Bedrock message format
    user_message = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_b64,
            },
        },
        {
            "type": "text",
            "text": (
                "Please classify this waste item by calling the "
                "record_classification tool with your findings."
            ),
        },
    ]

    try:
        result = agent(user_message)
        logger.debug("[STRANDS] Agent raw result: %s", result)
    except Exception as exc:
        logger.exception("[STRANDS] Agent invocation failed: %s", exc)
        return _UNKNOWN_RESULT

    # Extract tool call arguments from the result
    tool_args = _extract_tool_call(result)

    if not tool_args:
        # Fallback: try parsing plain-text response if the agent didn't use the tool
        logger.warning(
            "[STRANDS] Agent did not call record_classification. "
            "Response: %s", getattr(result, "message", result)
        )
        return _UNKNOWN_RESULT

    # Validate and normalize the tool arguments
    raw_category = str(tool_args.get("category", "other")).lower().strip()
    category = raw_category if raw_category in VALID_CATEGORIES else "other"
    confidence = float(tool_args.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))  # clamp to [0, 1]
    item_name = str(tool_args.get("item_name", filename))
    hazard_warning = tool_args.get("hazard_warning") or _DISPOSAL[category]["hazard_warning"]

    logger.info(
        "[STRANDS] Classification: item='%s' category='%s' confidence=%.2f",
        item_name, category, confidence,
    )

    advice = _DISPOSAL[category]
    return WasteAnalysisResponse(
        item_name=item_name,
        category=category,
        confidence=round(confidence, 4),
        hazard_warning=hazard_warning,
        disposal_method=advice["disposal_method"],
        recycler=None,  # Recycler lookup is out of MVP scope
        estimated_points=POINTS_PER_UNIT.get(category, 5),
    )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC INTERFACE
# ─────────────────────────────────────────────────────────────────────────────

def classify_waste(image_bytes: bytes, filename: str) -> WasteAnalysisResponse:
    """
    Classify a waste image.

    Routes to mock or Strands/Bedrock classifier based on MOCK_CLASSIFIER setting.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        filename:    Original filename (mock keyword matching + logging).

    Returns:
        WasteAnalysisResponse normalized to the public API contract.

    Raises:
        ValueError: image_bytes is empty.
    """
    if not image_bytes:
        raise ValueError("Empty image_bytes received by classifier.")

    settings = get_settings()
    if settings.MOCK_CLASSIFIER:
        return _mock_classify(image_bytes, filename)
    return _strands_classify(image_bytes, filename)
