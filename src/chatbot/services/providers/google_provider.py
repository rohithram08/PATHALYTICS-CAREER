# services/providers/google_provider.py

import httpx
from fastapi import HTTPException
from core.config import get_settings


def _convert_messages(messages: list[dict]) -> str:
    parts = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        parts.append(f"{role.upper()}: {content}")
    return "\n\n".join(parts)


async def google_chat(
    messages: list[dict],
    *,
    temperature: float,
    max_tokens: int,
) -> str:
    settings = get_settings()

    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Google API key.")

    prompt = _convert_messages(messages)

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GOOGLE_MODEL}:generateContent?key={settings.GOOGLE_API_KEY}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise HTTPException(status_code=502, detail="Google returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()

    if not text:
        raise HTTPException(status_code=502, detail="Google returned empty content.")

    return text