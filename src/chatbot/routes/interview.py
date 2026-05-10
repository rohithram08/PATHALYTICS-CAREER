# routes/interview.py

from fastapi import APIRouter, HTTPException

from models.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
    InterviewEvaluatedAnswer,
)
from services.interview_service import (
    generate_interview_questions,
    evaluate_interview_answers,
)

router = APIRouter(prefix="/api/interview", tags=["Interview"])


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(req: InterviewStartRequest):
    questions, used_fallback = await generate_interview_questions(
        career_title=req.career_title,
        difficulty=req.difficulty,
        question_count=req.question_count,
    )

    return InterviewStartResponse(
        questions=questions,
        used_fallback=used_fallback,
    )


@router.post("/evaluate", response_model=InterviewEvaluateResponse)
async def evaluate_interview(req: InterviewEvaluateRequest):
    if not req.answers:
        raise HTTPException(status_code=400, detail="At least one answer is required.")

    evaluated, closing_remark, used_fallback = await evaluate_interview_answers(
        career_title=req.career_title,
        difficulty=req.difficulty,
        answers=[
            {
                "question": a.question,
                "answer": a.answer,
                "time_taken": a.time_taken,
            }
            for a in req.answers
        ],
    )

    return InterviewEvaluateResponse(
        answers=[InterviewEvaluatedAnswer(**item) for item in evaluated],
        closing_remark=closing_remark,
        used_fallback=used_fallback,
    )