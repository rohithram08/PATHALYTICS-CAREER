// src/backend/routes/chatbot.js
// ─────────────────────────────────────────────────────────────
// Resilient Career AI & Chatbot Gateway
//
// Dual-mode gateway:
//   1. Tries internal FastAPI chatbot service if CHATBOT_API_URL is configured.
//   2. Fallbacks directly to Groq API using server-side GROQ_API_KEY.
//   3. Fallbacks to domain-intelligent career heuristics if upstream services are offline.
//
// NEVER exposes API keys to client browsers.
// Supports both authenticated users and guest interview/chat sessions.
// ─────────────────────────────────────────────────────────────

import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Rate limit: 30 requests per minute per user/IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) =>
    req.user?.id != null
      ? `user:${req.user.id}`
      : ipKeyGenerator(req),
  message: { message: "Too many requests. Please wait a moment before sending another." },
});

const messageHistorySchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
});

const chatSchema = z.object({
  message: z.string().min(1).max(5000).trim(),
  conversation_id: z.string().max(100).optional(),
  session_id: z.string().max(100).optional(),
  current_page: z.string().max(200).optional(),
  user_level: z.string().max(50).optional(),
  history: z.array(messageHistorySchema).optional(),
  context: z
    .object({
      career: z.string().max(200).optional(),
      location: z.string().max(100).optional(),
    })
    .optional(),
});

/**
 * Call Groq directly using server-side credentials
 */
async function callGroqDirect(promptMessages, temperature = 0.3, maxTokens = 800) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: promptMessages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Generate a domain-intelligent fallback when all external AI providers fail
 */
function generateDomainFallback(message) {
  const lower = message.toLowerCase();

  // Interview evaluation request
  if (lower.includes("evaluate the candidate's answer") || lower.includes("scoring rules")) {
    const isWeak =
      lower.includes("don't know") ||
      lower.includes("no idea") ||
      lower.includes("not sure") ||
      lower.includes("(no answer provided)");

    if (isWeak) {
      return JSON.stringify({
        score: 15,
        feedback:
          "[Offline Mode: Live AI services unavailable] The response did not provide sufficient technical depth. Review the core concepts and practice articulating foundational principles clearly.",
        is_fallback: true,
      });
    }

    return JSON.stringify({
      score: 78,
      feedback:
        "[Offline Mode: Live AI services unavailable] Solid conceptual grasp with good relevant terminology. To improve further, provide a concrete architectural example or discuss performance and edge-case trade-offs.",
      is_fallback: true,
    });
  }

  // Interview question generation
  if (lower.includes("technical interviewer") || lower.includes("ask one interview question")) {
    if (lower.includes("data") || lower.includes("machine learning")) {
      return "[Offline Practice Question] How would you handle significant class imbalance in a classification dataset, and what evaluation metrics would you prioritize over accuracy?";
    }
    if (lower.includes("security") || lower.includes("cyber")) {
      return "[Offline Practice Question] Can you explain how a Cross-Site Request Forgery (CSRF) attack works, and what defense mechanisms (such as SameSite cookies and anti-CSRF tokens) prevent it?";
    }
    if (lower.includes("frontend") || lower.includes("react")) {
      return "[Offline Practice Question] How does the React virtual DOM diffing algorithm work, and when would you use useMemo or useCallback to avoid costly re-renders?";
    }
    return "[Offline Practice Question] Could you describe a challenging technical bug or architectural bottleneck you encountered in a recent project, and walk me through your debugging approach?";
  }

  // Website analysis request
  if (lower.includes("analyze this website")) {
    return JSON.stringify({
      summary: "[Offline Analysis] Website evaluated using baseline career & portfolio heuristics.",
      strengths: ["Clear technical layout", "Demonstrable project implementation"],
      recommendations: [
        "Include live demonstration links and GitHub repository badges",
        "Add an interactive summary of key technologies used",
        "Ensure fast Core Web Vitals and accessible color contrast",
      ],
      is_fallback: true,
    });
  }

  // General career questions
  return (
    "*(Offline Mentor Mode: Live AI service is temporarily unavailable. Providing verified curriculum guidance.)*\n\n" +
    "Here is actionable guidance from your Pathalytics Career Mentor:\n\n" +
    "1. **Clarify Target Role Core Requirements**: Focus on mastering the 3-4 non-negotiable technologies requested in current job listings for your target role.\n" +
    "2. **Build Demonstrable Proof**: Create 2 complete, well-documented portfolio projects rather than dozens of incomplete tutorials.\n" +
    "3. **Practice Technical Articulation**: Use Pathalytics AI Mock Interviews to practice explaining your trade-offs clearly under pressure.\n\n" +
    "What specific role or skill would you like to dive deeper into today?"
  );
}

/**
 * Main chat handler supporting proxy, Groq direct, and smart fallback
 */
async function handleChat(req, res) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid chat payload",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { message, history = [], current_page, user_level = "intermediate" } = parsed.data;
  const chatbotUrl = process.env.CHATBOT_API_URL;

  // 1. Try internal FastAPI chatbot if URL is explicitly set
  if (chatbotUrl) {
    try {
      const response = await fetch(`${chatbotUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": process.env.CHATBOT_INTERNAL_KEY || "",
          "X-User-ID": String(req.user?.id || "guest"),
        },
        body: JSON.stringify({
          ...parsed.data,
          user_id: req.user?.id || null,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          reply: data.reply || data.response || "",
          status: "ok",
          provider: "chatbot_service",
        });
      }
    } catch (err) {
      console.warn("[chatbot] Upstream service unavailable, failing over to direct Groq:", err.message);
    }
  }

  // 2. Direct Groq LLM integration
  if (process.env.GROQ_API_KEY) {
    try {
      const systemPrompt =
        "You are Alex, the Pathalytics AI Career Mentor and Technical Interviewer. " +
        "You help students and job seekers navigate career roadmaps, prepare for interviews, evaluate skill gaps, and land meaningful tech jobs. " +
        "Keep your advice grounded, specific, actionable, and encouraging. Avoid generic fluff or fabricated credentials. " +
        "Guardrail: You only answer questions related to careers, education, technology, job searching, resumes, professional development, and technical interviews. If a user asks an out-of-domain question (e.g. cooking recipes, sports trivia, creative fiction, pop culture), politely decline and steer the conversation back to tech career guidance. " +
        "If instructed to output strict JSON, reply ONLY with valid JSON and no conversational markdown wrapper.\n" +
        `Current Context: Page=${current_page || "general"}, UserLevel=${user_level}.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      const reply = await callGroqDirect(messages);
      if (reply && reply.trim()) {
        return res.json({
          reply: reply.trim(),
          status: "ok",
          provider: "groq_direct",
        });
      }
    } catch (err) {
      console.error("[chatbot] Groq direct error:", err.message);
    }
  }

  // 3. Resilient domain fallback
  const fallbackReply = generateDomainFallback(message);
  return res.json({
    reply: fallbackReply,
    status: "ok",
    provider: "domain_engine",
    is_fallback: true,
  });
}

// ── Dual route mounting: /chat and / ─────────────────────────
router.post("/chat", optionalAuth, chatLimiter, handleChat);
router.post("/", optionalAuth, chatLimiter, handleChat);

// ── GET /api/chatbot/health ───────────────────────────────────
router.get("/health", async (_req, res) => {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const chatbotUrl = process.env.CHATBOT_API_URL;

  res.json({
    status: "ok",
    groqConfigured: hasGroq,
    fastApiConfigured: !!chatbotUrl,
  });
});

export default router;