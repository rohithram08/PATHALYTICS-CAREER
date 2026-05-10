# services/llm_service.py

from typing import Literal, AsyncGenerator
from fastapi import HTTPException

from core.config import get_settings
from services.provider_router import provider_chat
from services.providers.groq_provider import groq_chat_stream

LLMTask = Literal["chat", "interview_question", "interview_eval", "interview_summary", "website_eval"]


def get_task_max_tokens(task: LLMTask, override: int | None = None) -> int:
    """
    Central place to define max output tokens by task.
    """
    if override is not None:
        return override

    defaults = {
        "chat": 220,
        "interview_question": 120,
        "interview_eval": 500,
        "interview_summary": 120,
        "website_eval": 350,
    }
    return defaults.get(task, 220)


async def chat_completion(
    messages: list[dict],
    *,
    task: LLMTask = "chat",
    temperature: float = 0.3,
    max_tokens: int | None = None,
) -> str:
    """
    Provider-agnostic text completion using fallback providers.
    """
    return await provider_chat(
        messages,
        task=task,
        temperature=temperature,
        max_tokens=get_task_max_tokens(task, max_tokens),
    )


async def chat_stream(
    messages: list[dict],
    *,
    task: LLMTask = "chat",
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming currently supported through Groq only.
    Keeps existing chatbot streaming endpoint working.
    """
    settings = get_settings()
    selected_temp = temperature if temperature is not None else settings.TEMPERATURE
    selected_max_tokens = get_task_max_tokens(task, max_tokens)

    try:
        async for token in groq_chat_stream(
            messages,
            temperature=selected_temp,
            max_tokens=selected_max_tokens,
        ):
            yield token
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Streaming AI temporarily unavailable."
        ) from exc