# services/interview_service.py

import json
import re
from typing import List, Dict, Tuple

from services.llm_service import chat_completion
from services.interview_fallback import (
    get_fallback_questions,
    heuristic_score_answer,
    generate_fallback_closing_remark,
)


def _extract_json(text: str) -> dict | None:
    try:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        return json.loads(match.group(0))
    except Exception:
        return None


def _clean_questions(questions: list, question_count: int) -> list[str]:
    cleaned = []
    for q in questions:
        s = str(q).strip()
        if s:
            cleaned.append(s)
    return cleaned[:question_count]


async def generate_interview_questions(
    career_title: str,
    difficulty: str,
    question_count: int,
) -> Tuple[List[str], bool]:
    prompt = f"""
You are Alex, a professional interviewer.

Generate exactly {question_count} interview questions for a {career_title} candidate at {difficulty} level.

Rules:
- Return ONLY valid JSON
- Format:
{{"questions": ["q1", "q2", "q3"]}}
- Questions must be realistic, concise, and not repetitive
- Beginner = fundamentals
- Intermediate = applied problem solving
- Advanced = deep technical/system design
    """.strip()

    try:
        raw = await chat_completion(
            [{"role": "user", "content": prompt}],
            task="interview_question",
            temperature=0.4,
            max_tokens=220,
        )
        parsed = _extract_json(raw)
        questions = parsed.get("questions") if parsed else None

        if not isinstance(questions, list):
            raise ValueError("Invalid questions response")

        cleaned = _clean_questions(questions, question_count)
        if not cleaned:
            raise ValueError("No valid questions generated")

        while len(cleaned) < question_count:
            cleaned.extend(get_fallback_questions(career_title, difficulty, question_count - len(cleaned)))

        return cleaned[:question_count], False

    except Exception:
        return get_fallback_questions(career_title, difficulty, question_count), True


async def evaluate_interview_answers(
    career_title: str,
    difficulty: str,
    answers: List[Dict],
) -> Tuple[List[Dict], str, bool]:
    prompt_parts = []
    for i, item in enumerate(answers, start=1):
        prompt_parts.append(
            f'Q{i}: "{item["question"]}"\n'
            f'A{i}: "{item["answer"]}"\n'
        )

    joined = "\n".join(prompt_parts)

    prompt = f"""
You are Alex, a strict and realistic interviewer.

Role: {career_title}
Difficulty: {difficulty}

Evaluate all answers below.

Scoring rules:
- "I don't know", blank, or no meaningful content => 0 to 10
- very short vague answer => usually below 25
- score based on correctness, clarity, depth, terminology, and relevance

Return ONLY valid JSON in this exact structure:
{{
  "answers": [
    {{
      "questionNumber": 1,
      "score": 12,
      "feedback": "2-3 sentences"
    }}
  ],
  "closingRemark": "2-3 sentence final summary"
}}

Answers:
{joined}
    """.strip()

    try:
        raw = await chat_completion(
            [{"role": "user", "content": prompt}],
            task="interview_eval",
            temperature=0.2,
            max_tokens=700,
        )
        parsed = _extract_json(raw)
        if not parsed:
            raise ValueError("Missing JSON in evaluation response")

        parsed_answers = parsed.get("answers")
        closing_remark = str(parsed.get("closingRemark") or "").strip()

        if not isinstance(parsed_answers, list) or not parsed_answers:
            raise ValueError("Invalid evaluation answer list")

        evaluated = []
        for i, item in enumerate(answers):
            model_item = parsed_answers[i] if i < len(parsed_answers) else {}
            raw_score = model_item.get("score", 0)
            raw_feedback = model_item.get("feedback", "")

            try:
                score = max(0, min(100, int(raw_score)))
            except Exception:
                score = 0

            feedback = str(raw_feedback).strip() or "No feedback provided."

            evaluated.append({
                "questionNumber": i + 1,
                "question": item["question"],
                "answer": item["answer"],
                "score": score,
                "aiFeedback": feedback,
                "timeTaken": item.get("time_taken", 0),
            })

        if not closing_remark:
            avg_score = round(sum(a["score"] for a in evaluated) / len(evaluated)) if evaluated else 0
            closing_remark = generate_fallback_closing_remark(career_title, avg_score, evaluated)

        return evaluated, closing_remark, False

    except Exception:
        evaluated = []
        for i, item in enumerate(answers):
            score, feedback = heuristic_score_answer(item["answer"])
            evaluated.append({
                "questionNumber": i + 1,
                "question": item["question"],
                "answer": item["answer"],
                "score": score,
                "aiFeedback": feedback,
                "timeTaken": item.get("time_taken", 0),
            })

        avg_score = round(sum(a["score"] for a in evaluated) / len(evaluated)) if evaluated else 0
        closing_remark = generate_fallback_closing_remark(career_title, avg_score, evaluated)

        return evaluated, closing_remark, True