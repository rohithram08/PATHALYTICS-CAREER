# services/providers/mistral_provider.py

import httpx
from fastapi import HTTPException
from core.config import get_settings


async def mistral_chat(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
) -> str:
    settings = get_settings()

    if not settings.MISTRAL_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Mistral API key.")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.MISTRAL_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()