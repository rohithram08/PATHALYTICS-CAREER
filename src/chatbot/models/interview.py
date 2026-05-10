# models/interview.py

from pydantic import BaseModel, Field
from typing import Literal, Optional


Difficulty = Literal["Beginner", "Intermediate", "Advanced"]
InterviewMode = Literal["text", "voice"]


class InterviewStartRequest(BaseModel):
    career_title: str = Field(..., min_length=2, max_length=120)
    difficulty: Difficulty
    question_count: int = Field(..., ge=1, le=10)
    mode: InterviewMode = "text"


class InterviewStartResponse(BaseModel):
    questions: list[str]
    used_fallback: bool = False


class InterviewAnswerItem(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=0)
    time_taken: int = Field(0, ge=0, le=3600)


class InterviewEvaluateRequest(BaseModel):
    career_title: str = Field(..., min_length=2, max_length=120)
    difficulty: Difficulty
    answers: list[InterviewAnswerItem]


class InterviewEvaluatedAnswer(BaseModel):
    questionNumber: int
    question: str
    answer: str
    score: int = Field(..., ge=0, le=100)
    aiFeedback: str
    timeTaken: int = Field(0, ge=0, le=3600)


class InterviewEvaluateResponse(BaseModel):
    answers: list[InterviewEvaluatedAnswer]
    closing_remark: str
    used_fallback: bool = False