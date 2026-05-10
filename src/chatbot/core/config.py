from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    JWT_SECRET: str
    FRONTEND_URL: str = "https://pathalytics.vercel.app"

    PRIMARY_PROVIDER: str = "groq"
    SECONDARY_PROVIDER: str = "openrouter"
    TERTIARY_PROVIDER: str = "google"
    QUATERNARY_PROVIDER: str = "cohere"

    GROQ_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None
    HUGGINGFACE_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None
    COHERE_API_KEY: str | None = None
    AIML_API_KEY: str | None = None

    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENROUTER_MODEL: str = "meta-llama/llama-3.1-8b-instruct"
    GOOGLE_MODEL: str = "gemini-1.5-flash"
    COHERE_MODEL: str = "command-r"
    MISTRAL_MODEL: str = "mistral-small-latest"
    HUGGINGFACE_MODEL: str = "HuggingFaceH4/zephyr-7b-beta"

    TEMPERATURE: float = 0.3
    MAX_TOKENS: int = 220
    MAX_HISTORY_MESSAGES: int = 8

    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()