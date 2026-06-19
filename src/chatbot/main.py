import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import get_settings, ENV_FILE
from core.auth import get_current_user
from models.schemas import ChatRequest, ChatResponse
from services.chat_service import handle_chat, chat_streaming
from routes.interview import router as interview_router

settings = get_settings()

print("ENV FILE:", ENV_FILE)
print(
    "GROQ KEY PREFIX:",
    settings.GROQ_API_KEY[:12] if settings.GROQ_API_KEY else "MISSING",
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Pathalytics chatbot starting…")
    yield
    logger.info("🛑 Shutting down…")


app = FastAPI(
    title="Pathalytics Chatbot API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = [
    "https://pathalytics.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.FRONTEND_URL:
    ALLOWED_ORIGINS.append(settings.FRONTEND_URL.rstrip("/"))

ALLOWED_ORIGINS = list(set(ALLOWED_ORIGINS))

logger.info("Allowed CORS origins: %s", ALLOWED_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.options("/api/chat")
async def chat_options():
    return {"ok": True}


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest):
    return await handle_chat(req, user_id=None)


@app.post("/api/chat/stream")
@limiter.limit("20/minute")
async def chat_stream_endpoint(
    request: Request,
    req: ChatRequest,
    user=Depends(get_current_user),
):
    return StreamingResponse(
        chat_streaming(req, user_id=user["id"]),
        media_type="text/event-stream",
    )

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(interview_router)