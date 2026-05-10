"""
models/schemas.py
=================
All Pydantic request/response models.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, Any


# ----------------------------------------------------------------------
# Chat
# ----------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = Field(None, max_length=100)
    current_page: Optional[str] = Field(None, max_length=200)
    user_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()


class ChatResponse(BaseModel):
    reply: str
    intent: Literal[
        "career_guidance",
        "navigation",
        "roadmap",
        "website_analysis",
        "error",
    ]
    target_url: Optional[str] = None
    has_roadmap_json: bool = False
    roadmap_data: Optional[dict[str, Any]] = None
    structured_data: Optional[dict[str, Any]] = None
    website_evaluation: Optional[dict[str, Any]] = None


# ----------------------------------------------------------------------
# Website evaluation
# ----------------------------------------------------------------------
class WebsiteEvaluation(BaseModel):
    explanation: str
    advantages: list[str]
    disadvantages: list[str]
    score: int = Field(ge=0, le=100)
    design: int = Field(ge=0, le=100)
    usability: int = Field(ge=0, le=100)
    requirements: int = Field(ge=0, le=100)
    functionality: int = Field(ge=0, le=100)
    code_quality: int = Field(ge=0, le=100)
    improvements: list[str]


# ----------------------------------------------------------------------
# Roadmap image generation
# ----------------------------------------------------------------------
class RoadmapImageRequest(BaseModel):
    roadmap_spec: dict
    prompt: Optional[str] = None


class RoadmapImageResponse(BaseModel):
    image_url: str


# ----------------------------------------------------------------------
# Generic error
# ----------------------------------------------------------------------
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None