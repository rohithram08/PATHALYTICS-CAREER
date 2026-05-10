# services/providers/groq_provider.py

import logging
from functools import lru_cache
from typing import Any, AsyncGenerator

from fastapi import HTTPException
from groq import AsyncGroq, RateLimitError, APIError, AuthenticationError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_groq_client() -> AsyncGroq:
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Groq API key.")
    return AsyncGroq(api_key=settings.GROQ_API_KEY)


def safe_get_content(resp: Any) -> str:
    try:
        content = resp.choices[0].message.content
        if not content:
            return ""
        return str(content).strip()
    except Exception:
        logger.exception("Failed to extract content from Groq response")
        raise HTTPException(
            status_code=502,
            detail="Groq returned an invalid response."
        )


def extract_rate_limit_detail(error: Exception) -> str:
    msg = str(error)
    msg_lower = msg.lower()

    logger.warning("⚠️ Groq rate limit reached: %s", msg)

    if "tokens per day" in msg_lower or "tpd" in msg_lower:
        return "Groq daily token limit reached. Please try again later."

    if "requests per minute" in msg_lower or "rpm" in msg_lower:
        return "Groq request limit reached. Please wait a moment and try again."

    if "tokens per minute" in msg_lower or "tpm" in msg_lower:
        return "Groq token throughput limit reached. Please wait a moment and try again."

    return "Groq usage limit reached. Please try again shortly."


def map_groq_exception(exc: Exception) -> HTTPException:
    settings = get_settings()

    if isinstance(exc, AuthenticationError):
        masked = settings.GROQ_API_KEY[:12] + "..." if settings.GROQ_API_KEY else "MISSING"
        logger.error("❌ Groq AuthenticationError — key: %s", masked)
        return HTTPException(status_code=401, detail="Invalid Groq API key.")

    if isinstance(exc, RateLimitError):
        return HTTPException(status_code=429, detail=extract_rate_limit_detail(exc))

    if isinstance(exc, APIError):
        logger.exception("Groq APIError")
        return HTTPException(
            status_code=502,
            detail="Groq provider error. Please try again shortly."
        )

    logger.exception("Unexpected Groq failure")
    return HTTPException(
        status_code=500,
        detail="Groq service temporarily unavailable."
    )


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(APIError),
    reraise=True,
)
async def _create_completion(
    *,
    model: str,
    messages: list[dict],
    temperature: float,
    max_tokens: int,
) -> Any:
    client = get_groq_client()
    return await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )


async def groq_chat(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
) -> str:
    settings = get_settings()

    try:
        resp = await _create_completion(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return safe_get_content(resp)

    except HTTPException:
        raise
    except Exception as exc:
        raise map_groq_exception(exc) from exc


async def groq_chat_stream(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    client = get_groq_client()

    try:
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=temperature,
            max_completion_tokens=max_tokens,
            top_p=1,
            stream=True,
        )

        async for chunk in stream:
            try:
                if not chunk or not getattr(chunk, "choices", None):
                    continue

                choice = chunk.choices[0]
                delta = getattr(choice, "delta", None)
                if not delta:
                    continue

                content = getattr(delta, "content", None)
                if content:
                    yield str(content)

            except Exception:
                logger.exception("Malformed Groq streaming chunk received")
                continue

    except Exception as exc:
        raise map_groq_exception(exc) from exc