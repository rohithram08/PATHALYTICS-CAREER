# services/providers/cohere_provider.py

import httpx
from fastapi import HTTPException
from core.config import get_settings


def _flatten_messages(messages: list[dict]) -> str:
    return "\n\n".join(f'{m["role"].upper()}: {m["content"]}' for m in messages)


async def cohere_chat(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
) -> str:
    settings = get_settings()

    if not settings.COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Cohere API key.")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.cohere.ai/v1/chat",
            headers={
                "Authorization": f"Bearer {settings.COHERE_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.COHERE_MODEL,
                "message": _flatten_messages(messages),
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    text = data.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="Cohere returned empty content.")

    return text