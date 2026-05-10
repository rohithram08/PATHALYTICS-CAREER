import json
import logging
import os
import re
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

import httpx
from dotenv import load_dotenv

from models.schemas import ChatRequest, ChatResponse
from prompts.system import build_system_prompt

logger = logging.getLogger(__name__)

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "groq").lower()
SECONDARY_PROVIDER = os.getenv("SECONDARY_PROVIDER", "openrouter").lower()
TERTIARY_PROVIDER = os.getenv("TERTIARY_PROVIDER", "google").lower()
QUATERNARY_PROVIDER = os.getenv("QUATERNARY_PROVIDER", "cohere").lower()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct")
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
COHERE_MODEL = os.getenv("COHERE_MODEL", "command-r")

TEMPERATURE = float(os.getenv("TEMPERATURE", "0.3"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "220"))

VALID_ROADMAPS = {
    "frontend-developer": {
        "career": "Frontend Developer",
        "target_path": "/roadmaps/frontend-developer",
    },
    "backend-developer": {
        "career": "Backend Developer",
        "target_path": "/roadmaps/backend-developer",
    },
    "cloud-engineer": {
        "career": "Cloud Engineer",
        "target_path": "/roadmaps/cloud-engineer",
    },
    "ml-engineer": {
        "career": "Machine Learning Engineer",
        "target_path": "/roadmaps/ml-engineer",
    },
    "security-engineer": {
        "career": "Security Engineer",
        "target_path": "/roadmaps/security-engineer",
    },
}


def extract_json_block(text: str) -> dict[str, Any] | None:
    if not text:
        return None

    fenced_match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced_match:
        try:
            return json.loads(fenced_match.group(1))
        except Exception:
            return None

    plain_match = re.search(r"(\{.*\"type\".*\})", text, re.DOTALL)
    if plain_match:
        try:
            return json.loads(plain_match.group(1))
        except Exception:
            return None

    return None


def remove_json_block(text: str) -> str:
    if not text:
        return text
    return re.sub(r"```json\s*\{.*?\}\s*```", "", text, flags=re.DOTALL).strip()


def is_greeting(text: str) -> bool:
    normalized = text.strip().lower()
    greetings = {
        "hi", "hii", "hiii", "hello", "hey", "yo", "sup",
        "good morning", "good afternoon", "good evening", "hola"
    }
    return normalized in greetings


def detect_navigation_target(message: str) -> str | None:
    text = message.lower().strip()

    route_patterns = [
        ("/jobs", ["job", "jobs", "openings", "vacancies"]),
        ("/roadmaps", ["roadmap", "roadmaps", "learning path", "career path"]),
        ("/career-recommendation", ["career recommendation", "recommend a career", "choose a career"]),
        ("/interview", ["interview", "mock interview", "practice interview"]),
        ("/saved-careers", ["saved careers", "bookmarks", "saved careers page"]),
        ("/settings", ["settings", "preferences", "account settings"]),
        ("/profile", ["profile", "my profile"]),
        ("/chatbot", ["chatbot page", "assistant page"]),
        ("/dashboard", ["dashboard", "home page"]),
        ("/blog", ["blog", "articles"]),
        ("/career-tips", ["career tips"]),
        ("/industry-insights", ["industry insights", "market insights"]),
        ("/success-stories", ["success stories"]),
        ("/about", ["about"]),
        ("/privacy-policy", ["privacy policy"]),
        ("/terms-of-service", ["terms of service", "terms"]),
    ]

    for route, keywords in route_patterns:
        if any(keyword in text for keyword in keywords):
            return route

    return None


def build_navigation_reply(target_url: str) -> str:
    replies = {
        "/jobs": "I can help with that. The Jobs page is the best place to explore openings.",
        "/roadmaps": "Sure — the Roadmaps page is the best place to explore learning paths.",
        "/career-recommendation": "I can guide you there. The Career Recommendation page is the right place to begin.",
        "/interview": "You can practice from the Interview section.",
        "/saved-careers": "Your saved careers are available in the Saved Careers page.",
        "/settings": "You can manage your preferences in Settings.",
        "/profile": "Your profile page is the right place for that.",
        "/chatbot": "You're already in the chatbot section.",
        "/dashboard": "The Dashboard is the main overview page.",
        "/blog": "The Blog page is a good place to browse articles.",
        "/career-tips": "The Career Tips page has guidance and advice.",
        "/industry-insights": "The Industry Insights page covers trends and updates.",
        "/success-stories": "The Success Stories page highlights user journeys.",
        "/about": "The About page explains what Pathalytics is about.",
        "/privacy-policy": "The Privacy Policy page covers data and privacy details.",
        "/terms-of-service": "The Terms of Service page covers usage terms.",
    }
    return replies.get(target_url, "I can take you to that section.")


def detect_intent(message: str) -> str:
    text = message.lower().strip()

    if is_greeting(text):
        return "navigation"

    if re.search(r"\b(who am i|what do you know about me|tell me about me)\b", text):
        return "navigation"

    if detect_navigation_target(text):
        return "navigation"

    if re.search(r"\b(analyze|evaluate|review)\b.*\b(website|portfolio|project)\b", text):
        return "website_analysis"

    if re.search(r"https?://", text) and any(word in text for word in ["website", "portfolio", "project", "analyze", "review"]):
        return "website_analysis"

    career_patterns = [
        r"\brecommend\b.*\bcareer\b",
        r"\bcareer recommendation\b",
        r"\bwhich career\b",
        r"\bwhat career\b",
        r"\bbest role\b",
        r"\bwhich roadmap\b",
        r"\bwhat should i learn\b",
        r"\bwhat path should i take\b",
        r"\bwhat suits me\b",
        r"\bdata science\b",
        r"\bmachine learning\b",
        r"\bartificial intelligence\b",
        r"\bai\b",
        r"\bml\b",
    ]

    if any(re.search(pattern, text) for pattern in career_patterns):
        return "career_guidance"

    return "navigation"


def sanitize_structured_data(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(data, dict):
        return None

    if data.get("type") != "career_guidance":
        return None

    roadmap_id = data.get("recommended_roadmap")
    if roadmap_id not in VALID_ROADMAPS:
        return None

    valid_entry = VALID_ROADMAPS[roadmap_id]
    next_steps = data.get("next_steps")
    skills_to_focus = data.get("skills_to_focus")

    return {
        "type": "career_guidance",
        "recommended_career": valid_entry["career"],
        "recommended_roadmap": roadmap_id,
        "career_reason": str(
            data.get("career_reason") or "Recommended based on the user's stated interests."
        ),
        "next_steps": [str(x) for x in next_steps[:5]] if isinstance(next_steps, list) else [],
        "skills_to_focus": [str(x) for x in skills_to_focus[:6]] if isinstance(skills_to_focus, list) else [],
        "target_path": valid_entry["target_path"],
    }


def build_fallback_structured_data(user_message: str) -> dict[str, Any] | None:
    text = user_message.lower()

    keyword_map = [
        ("ml-engineer", ["ai", "ml", "machine learning", "data science", "python", "model", "deep learning"]),
        ("frontend-developer", ["frontend", "ui", "ux", "react", "design", "web", "javascript"]),
        ("backend-developer", ["backend", "api", "server", "database", "auth", "django", "node", "fastapi"]),
        ("cloud-engineer", ["cloud", "devops", "deployment", "aws", "azure", "gcp", "docker"]),
        ("security-engineer", ["security", "cybersecurity", "ethical hacking", "penetration", "threat"]),
    ]

    for roadmap_id, keywords in keyword_map:
        if any(word in text for word in keywords):
            valid_entry = VALID_ROADMAPS[roadmap_id]
            return {
                "type": "career_guidance",
                "recommended_career": valid_entry["career"],
                "recommended_roadmap": roadmap_id,
                "career_reason": "Closest valid PATHLYTICS recommendation based on the user's input.",
                "next_steps": [],
                "skills_to_focus": [],
                "target_path": valid_entry["target_path"],
            }

    return None


def build_website_evaluation_fallback(message: str) -> str:
    url_match = re.search(r"(https?://[^\s]+)", message)
    website_url = url_match.group(1) if url_match else "the submitted website"

    payload = {
        "score": 78,
        "explanation": f"This is a fallback evaluation for {website_url}. Live provider analysis is currently unavailable.",
        "design": 80,
        "usability": 76,
        "requirements": 75,
        "functionality": 79,
        "codequality": 74,
        "advantages": [
            "Clear project direction is visible.",
            "The project can still be evaluated structurally.",
            "Frontend integration remains functional.",
        ],
        "disadvantages": [
            "Live model analysis is unavailable.",
            "Detailed code and UX review is limited.",
        ],
        "improvements": [
            "Restore provider access for live scoring.",
            "Include more project context.",
            "Test responsiveness and accessibility.",
        ],
    }

    return json.dumps(payload)


def build_prompt_for_intent(system_prompt: str, user_message: str, intent: str) -> list[dict[str, str]]:
    if intent == "career_guidance":
        career_prompt = f"""
{system_prompt}

You are a career guidance assistant for PATHLYTICS.

Task:
- Help the user choose a direction only when they are clearly asking for learning or career guidance.
- If enough information is available, recommend exactly one roadmap from:
  frontend-developer, backend-developer, cloud-engineer, ml-engineer, security-engineer
- If information is incomplete, ask only 1 short follow-up question.
- First answer naturally in plain English.
- Only then include a JSON block if you are confident in one roadmap recommendation.

Important:
- Do not output JSON unless you are recommending a roadmap.
- Do not behave like a questionnaire for casual chat.
- Keep the answer concise and practical.

JSON format:
```json
{{
  "type": "career_guidance",
  "recommended_career": "Career Name",
  "recommended_roadmap": "one-of-the-valid-roadmap-ids",
  "career_reason": "short reason",
  "next_steps": ["step 1", "step 2"],
  "skills_to_focus": ["skill 1", "skill 2"]
}}
```
""".strip()

        return [
            {"role": "system", "content": career_prompt},
            {"role": "user", "content": user_message},
        ]

    if intent == "website_analysis":
        website_prompt = f"""
{system_prompt}

You are a website evaluator for PATHLYTICS.

Return only valid JSON in this shape:
{{
  "score": 0,
  "explanation": "short summary",
  "design": 0,
  "usability": 0,
  "requirements": 0,
  "functionality": 0,
  "codequality": 0,
  "advantages": ["..."],
  "disadvantages": ["..."],
  "improvements": ["..."]
}}
""".strip()

        return [
            {"role": "system", "content": website_prompt},
            {"role": "user", "content": user_message},
        ]

    general_prompt = f"""
{system_prompt}

You are a friendly assistant inside PATHLYTICS.
- Reply naturally for greetings, small talk, and broad questions.
- Help users explore the platform.
- Do not ask career-recommendation questions unless the user clearly asks for career help.
- Do not output JSON for general chat.
- If the user asks "who am i", answer only from the conversation and be honest about limits.
""".strip()

    return [
        {"role": "system", "content": general_prompt},
        {"role": "user", "content": user_message},
    ]


async def call_openrouter(messages: list[dict[str, str]]) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pathalytics.vercel.app",
        "X-Title": "Pathalytics Chatbot",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def call_groq(messages: list[dict[str, str]]) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def call_google(messages: list[dict[str, str]]) -> str:
    prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": TEMPERATURE,
            "maxOutputTokens": MAX_TOKENS,
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GOOGLE_MODEL}:generateContent?key={GOOGLE_API_KEY}"

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def call_cohere(messages: list[dict[str, str]]) -> str:
    prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])

    headers = {
        "Authorization": f"Bearer {COHERE_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": COHERE_MODEL,
        "message": prompt,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            "https://api.cohere.ai/v1/chat",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["text"].strip()


async def try_provider(provider: str, messages: list[dict[str, str]]) -> str:
    provider = provider.lower()

    if provider == "groq" and GROQ_API_KEY:
        return await call_groq(messages)

    if provider == "openrouter" and OPENROUTER_API_KEY:
        return await call_openrouter(messages)

    if provider == "google" and GOOGLE_API_KEY:
        return await call_google(messages)

    if provider == "cohere" and COHERE_API_KEY:
        return await call_cohere(messages)

    raise RuntimeError(f"Provider '{provider}' is not configured.")


async def chat_completion(messages: list[dict[str, str]]) -> str:
    providers = [
        PRIMARY_PROVIDER,
        SECONDARY_PROVIDER,
        TERTIARY_PROVIDER,
        QUATERNARY_PROVIDER,
    ]

    errors = []

    for provider in providers:
        try:
            logger.info("Trying provider: %s", provider)
            return await try_provider(provider, messages)
        except Exception as e:
            logger.warning("Provider %s failed: %s", provider, e)
            errors.append(f"{provider}: {e}")

    logger.error("All providers failed: %s", " | ".join(errors))
    return "Sorry, all AI providers are unavailable right now. Please try again shortly."


async def handle_chat(req: ChatRequest, user_id: Optional[str] = None) -> ChatResponse:
    user_message = req.message.strip()
    system_prompt = build_system_prompt("")
    intent = detect_intent(user_message)
    nav_target = detect_navigation_target(user_message)

    if intent == "navigation" and nav_target:
        return ChatResponse(
            reply=build_navigation_reply(nav_target),
            intent="navigation",
            target_url=nav_target,
            has_roadmap_json=False,
            roadmap_data=None,
            structured_data=None,
            website_evaluation=None,
        )

    messages = build_prompt_for_intent(system_prompt, user_message, intent)
    raw_reply = await chat_completion(messages)

    if intent == "website_analysis":
        return ChatResponse(
            reply=raw_reply,
            intent="website_analysis",
            target_url=None,
            has_roadmap_json=False,
            roadmap_data=None,
            structured_data=None,
            website_evaluation=None,
        )

    cleaned_reply = remove_json_block(raw_reply)
    parsed_json = extract_json_block(raw_reply)
    structured_data = sanitize_structured_data(parsed_json)

    if structured_data is None and intent == "career_guidance":
        structured_data = build_fallback_structured_data(user_message)

    target_url = structured_data["target_path"] if structured_data else None

    return ChatResponse(
        reply=cleaned_reply,
        intent="career_guidance" if structured_data else intent,
        target_url=target_url,
        has_roadmap_json=structured_data is not None,
        roadmap_data=structured_data,
        structured_data=structured_data,
        website_evaluation=None,
    )


async def chat_streaming(
    req: ChatRequest,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    response = await handle_chat(req, user_id=user_id)

    payload = {
        "reply": response.reply,
        "intent": response.intent,
        "target_url": response.target_url,
        "has_roadmap_json": response.has_roadmap_json,
        "roadmap_data": response.roadmap_data,
        "structured_data": response.structured_data,
        "website_evaluation": response.website_evaluation,
    }

    yield f"data: {json.dumps(payload)}\n\n"
    yield "data: [DONE]\n\n"