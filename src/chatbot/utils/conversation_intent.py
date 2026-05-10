# utils/conversation_intent.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class IntentResult:
    reply: str
    end_session: bool = False
    handled: bool = True


def normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


CONTINUE_WORDS = {
    "yes", "yeah", "yep", "sure", "ok", "okay", "continue", "go on"
}

GRATITUDE_WORDS = {
    "thanks", "thank you", "thx", "ok thank you", "okay thank you", "thanks a lot"
}

CLOSE_WORDS = {
    "nothing",
    "nothing else",
    "that's all",
    "thats all",
    "no thanks",
    "bye",
    "goodbye",
    "i'm done",
    "im done",
    "all good",
    "done",
}

ANYTHING_ELSE_PATTERNS = [
    "anything else",
    "what would you like next",
    "what would you like to know next",
    "would you like to explore more",
    "is there anything else",
    "what else would you like",
]

MULTI_OPTION_PATTERNS = [
    ("skills required", "salary range"),
    ("skills", "salary"),
    ("career recommendations", "roadmap"),
]

AREA_INTEREST_PATTERNS = [
    "what specific area of computer science are you interested in",
    "what area are you interested in",
    "which area would you like to explore",
]


def handle_short_conversation_reply(
    user_text: str,
    last_assistant_text: Optional[str] = None,
) -> Optional[IntentResult]:
    """
    Handles short user replies like:
    - yes
    - thank you
    - nothing
    - no

    Returns IntentResult if handled, else None.
    """

    u = normalize(user_text)
    a = normalize(last_assistant_text or "")

    # 1) Gratitude
    if u in GRATITUDE_WORDS:
        return IntentResult(
            reply="You're welcome! If you'd like later, I can also help with a roadmap, skills, or project ideas.",
            end_session=False,
        )

    # 2) Explicit close
    if u in CLOSE_WORDS:
        return IntentResult(
            reply="Got it — take care, and feel free to come back anytime.",
            end_session=True,
        )

    # 3) "no" depends on previous assistant question
    if u == "no":
        if any(pattern in a for pattern in ANYTHING_ELSE_PATTERNS):
            return IntentResult(
                reply="Got it — take care, and feel free to come back anytime.",
                end_session=True,
            )
        return IntentResult(
            reply="No problem. If you'd like help with anything else later, I'm here.",
            end_session=False,
        )

    # 4) Continuation cues like "yes", "ok", "sure"
    if u in CONTINUE_WORDS:
        # If previous assistant asked about broad area
        if any(pattern in a for pattern in AREA_INTEREST_PATTERNS):
            return IntentResult(
                reply=(
                    "Sure — are you interested in data science, UI/UX, web development, "
                    "cloud, cybersecurity, AI/ML, or something else?"
                ),
                end_session=False,
            )

        # If previous assistant asked between skills/salary
        if ("skills required" in a and "salary range" in a) or ("skills" in a and "salary" in a):
            return IntentResult(
                reply="Sure — would you like to know about the skills required, the salary range, or both?",
                end_session=False,
            )

        # If previous assistant asked a generic question
        if "what's on your mind" in a or "how can i help you today" in a:
            return IntentResult(
                reply="Sure — tell me what you need help with, and I’ll do my best to guide you.",
                end_session=False,
            )

        # Safe generic continuation
        return IntentResult(
            reply="Sure — what would you like to explore next?",
            end_session=False,
        )

    # 5) "both" handling for option-based questions
    if u == "both":
        if ("skills required" in a and "salary range" in a) or ("skills" in a and "salary" in a):
            return IntentResult(
                reply=(
                    "Great — for Data Science, the key skills usually include Python, statistics, "
                    "SQL, machine learning, and data visualization. In India, salary can vary by city, "
                    "skills, and experience, but entry-level roles are typically much lower than senior roles. "
                    "If you want, I can break this down into beginner skills first and then explain salary progression."
                ),
                end_session=False,
            )

    return None