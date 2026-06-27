// src/backend/routes/chatbot.js
// ─────────────────────────────────────────────────────────────
// Secure Chatbot API Proxy
//
// WHY THIS EXISTS:
//   All GROQ / OpenRouter / Google AI / Cohere / Mistral API
//   keys must NEVER reach the browser. Old architecture called
//   the chatbot FastAPI directly from the frontend — any user
//   could open Network tab and steal those keys to run their
//   own AI queries at your expense.
//
// This route acts as a SECURE GATEWAY:
//   Browser → /api/chatbot (your backend, authenticated)
//           → FastAPI chatbot (internal, with your API keys)
//
// The FastAPI chatbot URL is also a server-side env var.
// ─────────────────────────────────────────────────────────────

import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Rate limit: 20 chat messages per user per minute.
//
// WHY ipKeyGenerator here?
//   express-rate-limit v7+ validates that any keyGenerator which falls
//   back to req.ip uses their ipKeyGenerator helper.  The helper
//   normalises IPv6 addresses (e.g. strips the "::ffff:" prefix that
//   proxies add), preventing the same IPv6 user from bypassing limits
//   by rotating /64 subnets.  When req.user?.id is present we key by
//   user ID instead — no IP involved, no normalisation needed.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) =>
    req.user?.id != null
      ? `user:${req.user.id}`           // authenticated — key by user id
      : ipKeyGenerator(req),            // unauthenticated fallback — IPv6-safe
  message: { message: "Too many messages. Please wait before sending another." },
});

// Input validation for chat messages
const chatSchema = z.object({
  message:         z.string().min(1).max(2000).trim(),
  conversation_id: z.string().max(100).optional(),
  context: z
    .object({
      career:   z.string().max(200).optional(),
      location: z.string().max(100).optional(),
    })
    .optional(),
});

// ── POST /api/chatbot/chat ─────────────────────────────────────
// requireAuth ensures only logged-in users can chat
router.post("/chat", requireAuth, chatLimiter, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid message",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const chatbotUrl = process.env.CHATBOT_API_URL;
  if (!chatbotUrl) {
    return res.status(503).json({ message: "Chat service is temporarily unavailable." });
  }

  try {
    // Forward the request to the internal FastAPI chatbot.
    // The chatbot service validates our internal CHATBOT_INTERNAL_KEY.
    const response = await fetch(`${chatbotUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "X-Internal-Key": process.env.CHATBOT_INTERNAL_KEY || "",
        "X-User-ID":      String(req.user.id), // pass authenticated user ID
      },
      body: JSON.stringify({
        ...parsed.data,
        user_id: req.user.id, // server-injected, not user-provided
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout for AI responses
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[chatbot] upstream error:", response.status, err);
      return res.status(502).json({ message: "Chat service error. Please try again." });
    }

    // Stream the response back to the client
    res.set("Content-Type", "text/event-stream");
    res.set("Cache-Control", "no-cache");
    res.set("Connection", "keep-alive");

    const reader = response.body?.getReader();
    if (!reader) {
      const data = await response.json();
      return res.json(data);
    }

    // Stream SSE chunks
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        res.write(decoder.decode(value, { stream: !done }));
      }
    }
    res.end();
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ message: "Chat response timed out. Please try again." });
    }
    console.error("[chatbot] error:", err);
    return res.status(500).json({ message: "An error occurred with the chat service." });
  }
});

// ── GET /api/chatbot/health ───────────────────────────────────
router.get("/health", async (_req, res) => {
  const chatbotUrl = process.env.CHATBOT_API_URL;
  if (!chatbotUrl) return res.json({ status: "disabled" });

  try {
    const r = await fetch(`${chatbotUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    res.json({ status: r.ok ? "ok" : "degraded" });
  } catch {
    res.json({ status: "unreachable" });
  }
});

export default router;