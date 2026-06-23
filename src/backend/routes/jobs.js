// src/backend/routes/jobs.js
// ─────────────────────────────────────────────────────────────
// Secure Jobs API Proxy
//
// WHY THIS EXISTS:
//   Old code called Adzuna API directly from the browser using
//   VITE_ADZUNA_APP_ID / VITE_ADZUNA_APP_KEY — these keys were
//   bundled into the public JavaScript bundle and visible to
//   ANYONE who opened DevTools → Network tab.
//
//   This route keeps the Adzuna credentials server-side.
//   The frontend calls /api/jobs and gets back clean JSON.
//   Adzuna never sees the user's browser directly.
//
// Also adds: server-side rate limiting, input validation,
//            response caching (60s), and error sanitization.
// ─────────────────────────────────────────────────────────────
// Add at the top of jobs.js with the other imports
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = express.Router();

// Simple in-process cache to reduce Adzuna API calls
const cache = new Map();   // key → { data, expiresAt }
const CACHE_TTL_MS = 60 * 1000;   // 60 seconds

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  // Prevent unbounded cache growth
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// Rate limit: 30 job searches per IP per minute
const jobsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many job search requests. Please wait a moment." },
});

// Validation schema for job search query params
const jobSearchSchema = z.object({
  what:     z.string().max(100).optional().default(""),
  where:    z.string().max(100).optional().default("India"),
  results:  z.coerce.number().int().min(1).max(50).optional().default(20),
  page:     z.coerce.number().int().min(1).max(100).optional().default(1),
  sort_by:  z.enum(["relevance", "date", "salary"]).optional().default("relevance"),
  full_time: z.coerce.number().int().min(0).max(1).optional(),
});

// ── GET /api/jobs ─────────────────────────────────────────────
router.get("/", jobsLimiter, async (req, res) => {
  // Validate query parameters
  const parsed = jobSearchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid search parameters",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { what, where, results, page, sort_by, full_time } = parsed.data;

  // Check server-side credentials
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(503).json({ message: "Job search is temporarily unavailable" });
  }

  // Build cache key from clean params
  const cacheKey = `jobs:${what}:${where}:${results}:${page}:${sort_by}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    return res.json(cached);
  }

  // Build Adzuna API URL with server-side credentials
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/in/search/${page}`
  );
  url.searchParams.set("app_id",      appId);
  url.searchParams.set("app_key",     appKey);
  url.searchParams.set("results_per_page", String(results));
  url.searchParams.set("what",        what);
  url.searchParams.set("where",       where);
  url.searchParams.set("sort_by",     sort_by);
  url.searchParams.set("content-type", "application/json");
  if (full_time !== undefined) {
    url.searchParams.set("full_time", String(full_time));
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),    // 8s timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[jobs] Adzuna error:", response.status, errText.slice(0, 200));
      return res.status(502).json({ message: "Job search service error. Please try again." });
    }

    const data = await response.json();

    // Clean response — only expose what the frontend needs
    const cleaned = {
      count: data.count || 0,
      mean:  data.mean || 0,
      results: (data.results || []).map((job) => ({
        id:          job.id,
        title:       job.title,
        description: job.description,
        company:     job.company?.display_name || "",
        location:    job.location?.display_name || "",
        salary_min:  job.salary_min || null,
        salary_max:  job.salary_max || null,
        created:     job.created,
        redirect_url: job.redirect_url,
        category:    job.category?.label || "",
        contract_type: job.contract_type || null,
      })),
    };

    setCache(cacheKey, cleaned);
    res.set("X-Cache", "MISS");
    res.json(cleaned);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ message: "Job search timed out. Please try again." });
    }
    console.error("[jobs] Unexpected error:", err);
    return res.status(500).json({ message: "An error occurred while searching for jobs." });
  }
});

import { requireAuth, requireRole } from "../middleware/auth.js";

// ── GET /api/jobs/mine — recruiter's own job listings ─────────
router.get("/mine", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    // Get the recruiter_profiles.id for this user first
    const [profile] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );
    if (!profile.length) {
      return res.json({ results: [], count: 0 });
    }

    const [jobs] = await db.query(
      `SELECT id, title, location, job_type, status,
              salary_min, salary_max, salary_currency,
              created_at, updated_at
       FROM jobs
       WHERE recruiter_id = ?
       ORDER BY created_at DESC`,
      [profile[0].id]
    );

    return res.json({ results: jobs, count: jobs.length });
  } catch (err) {
    console.error("[jobs:mine]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;