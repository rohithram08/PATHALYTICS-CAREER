# services/provider_router.py

import logging
from typing import Literal
from fastapi import HTTPException

from core.config import get_settings
from services.providers.groq_provider import groq_chat
from services.providers.openrouter_provider import openrouter_chat
from services.providers.google_provider import google_chat
from services.providers.cohere_provider import cohere_chat
from services.providers.mistral_provider import mistral_chat

logger = logging.getLogger(__name__)

LLMTask = Literal["chat", "interview_question", "interview_eval", "interview_summary", "website_eval"]


def get_provider_order(task: LLMTask) -> list[str]:
    settings = get_settings()

    base = [
        settings.PRIMARY_PROVIDER,
        settings.SECONDARY_PROVIDER,
        settings.TERTIARY_PROVIDER,
        settings.QUATERNARY_PROVIDER,
        "mistral",
    ]

    # remove duplicates while preserving order
    seen = set()
    ordered = []
    for p in base:
        if p and p not in seen:
            ordered.append(p)
            seen.add(p)

    return ordered


async def provider_chat(
    messages: list[dict],
    *,
    task: LLMTask,
    temperature: float,
    max_tokens: int,
) -> str:
    order = get_provider_order(task)
    errors = []

    for provider in order:
        try:
            if provider == "groq":
                return await groq_chat(messages, temperature=temperature, max_tokens=max_tokens)

            if provider == "openrouter":
                return await openrouter_chat(messages, temperature=temperature, max_tokens=max_tokens)

            if provider == "google":
                return await google_chat(messages, temperature=temperature, max_tokens=max_tokens)

            if provider == "cohere":
                return await cohere_chat(messages, temperature=temperature, max_tokens=max_tokens)

            if provider == "mistral":
                return await mistral_chat(messages, temperature=temperature, max_tokens=max_tokens)

        except Exception as e:
            logger.warning("Provider %s failed: %s", provider, str(e))
            errors.append(f"{provider}: {str(e)}")
            continue

    raise HTTPException(
        status_code=503,
        detail="All LLM providers failed."
    )