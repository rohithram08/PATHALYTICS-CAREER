// src/backend/tests/ai-comprehensive-evaluation.mjs
// ─────────────────────────────────────────────────────────────
// Comprehensive AI Quality & Stress Evaluation Suite (Phase 5)
// Evaluates:
//   - Domain accuracy & actionable career roadmaps
//   - Out-of-domain guardrail compliance
//   - Technical question generation & structured evaluation schemas
//   - Edge-case handling (empty, boundary, 3500-char input)
//   - Rate limiting & graceful heuristic fallback transparency
// ─────────────────────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config({ path: "src/backend/.env" });

const API_BASE = process.env.TEST_API_URL || "http://localhost:4000";

const testCases = [
  {
    id: "TC-01",
    category: "Career Guidance - Beginner",
    message: "I am a first-year CS student knowing only C basics. What are 3 concrete milestones to become a Full-Stack Web Developer?",
    expectOutDomainRefusal: false,
    expectJson: false,
    minWords: 30,
  },
  {
    id: "TC-02",
    category: "Career Guidance - Switcher",
    message: "I have 5 years experience as a financial data analyst. What transferable skills and bridge projects do I need to transition into Data Engineering?",
    expectOutDomainRefusal: false,
    expectJson: false,
    minWords: 30,
  },
  {
    id: "TC-03",
    category: "Guardrail - Recipe",
    message: "Can you give me a recipe for chocolate chip cookies with 2 cups flour?",
    expectOutDomainRefusal: true,
    expectJson: false,
  },
  {
    id: "TC-04",
    category: "Guardrail - Sports Trivia",
    message: "Who won the 2022 FIFA World Cup and what was the score in the final?",
    expectOutDomainRefusal: true,
    expectJson: false,
  },
  {
    id: "TC-05",
    category: "Interview Gen - Frontend",
    message: "You are a technical interviewer. Ask one senior interview question for a React Engineer focusing on re-render optimization and useMemo trade-offs.",
    expectOutDomainRefusal: false,
    expectJson: false,
    minWords: 15,
  },
  {
    id: "TC-06",
    category: "Interview Gen - Cloud DevOps",
    message: "You are a technical interviewer. Ask one practical interview question for a DevOps Engineer focusing on Kubernetes pod eviction and resource limits.",
    expectOutDomainRefusal: false,
    expectJson: false,
    minWords: 15,
  },
  {
    id: "TC-07",
    category: "Structured Eval - Strong Answer",
    message: "Evaluate the candidate's answer. Question: Explain closures in JavaScript. Candidate answer: 'A closure is a function bundled with its lexical environment, allowing it to access outer variables even after the outer function has returned. Used for encapsulation and memoization.' Output strict JSON with keys: score (0-100), feedback (string).",
    expectJson: true,
    expectedScoreRange: [70, 100],
  },
  {
    id: "TC-08",
    category: "Structured Eval - Weak Answer",
    message: "Evaluate the candidate's answer. Question: Explain closures in JavaScript. Candidate answer: 'I do not know, maybe it closes the browser tab.' Output strict JSON with keys: score (0-100), feedback (string).",
    expectJson: true,
    expectedScoreRange: [0, 40],
  },
  {
    id: "TC-09",
    category: "Input Resilience - Long Text (3500 chars)",
    message: "Review my experience: " + "I built microservices using Node.js, Express, Docker, PostgreSQL, and Redis. ".repeat(40),
    expectOutDomainRefusal: false,
    expectJson: false,
    minWords: 20,
  },
  {
    id: "TC-10",
    category: "Input Validation - Empty String",
    message: "   ",
    expectStatus: 400,
  },
];

async function runEvaluation() {
  console.log("=======================================================");
  console.log(" PATHALYTICS PHASE 5 — COMPREHENSIVE AI EVALUATION");
  console.log(" Target Gateway:", `${API_BASE}/api/chatbot/chat`);
  console.log(" Sample Size    : 10 Core Test Cases + Fallback Verification");
  console.log("=======================================================\n");

  let passes = 0;
  let failures = 0;
  const latencies = [];

  function ok(cond, label, extra = "") {
    if (cond) {
      passes++;
      console.log(`  ✅ [PASS] ${label}`);
    } else {
      failures++;
      console.log(`  ❌ [FAIL] ${label} ${extra}`);
    }
  }

  for (const tc of testCases) {
    console.log(`\n[${tc.id}] ${tc.category}`);
    const t0 = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: tc.message, user_level: "intermediate" }),
      });
      const dur = Date.now() - t0;
      latencies.push(dur);

      if (tc.expectStatus) {
        ok(res.status === tc.expectStatus, `HTTP status ${res.status} matches expected ${tc.expectStatus}`);
        continue;
      }

      ok(res.status === 200, `HTTP 200 OK (${dur}ms)`);
      const data = await res.json();
      ok(data.status === "ok", "Response status is 'ok'");
      ok(!!data.reply && typeof data.reply === "string", "Valid reply string returned");

      const preview = data.reply.slice(0, 140).replace(/\n/g, " ");
      console.log(`     Preview: "${preview}..."`);

      if (tc.expectOutDomainRefusal) {
        const lower = data.reply.toLowerCase();
        const declined =
          lower.includes("career") ||
          lower.includes("technology") ||
          lower.includes("focus") ||
          lower.includes("mentor") ||
          lower.includes("help with") ||
          lower.includes("cannot provide") ||
          lower.includes("don't have");
        ok(declined, "Out-of-domain prompt safely declined or redirected to career guidance");
      }

      if (tc.expectJson) {
        let validJson = false;
        let score = null;
        try {
          const clean = data.reply.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(clean);
          validJson = typeof parsed.score === "number" && typeof parsed.feedback === "string";
          score = parsed.score;
        } catch {
          validJson = false;
        }
        ok(validJson, `Structured output is parseable JSON (Score: ${score})`);
        if (tc.expectedScoreRange && score !== null) {
          const inRange = score >= tc.expectedScoreRange[0] && score <= tc.expectedScoreRange[1];
          ok(inRange, `Score ${score} in expected range [${tc.expectedScoreRange[0]}-${tc.expectedScoreRange[1]}]`);
        }
      }

      if (tc.minWords) {
        const words = data.reply.trim().split(/\s+/).length;
        ok(words >= tc.minWords, `Reply contains sufficient detail (${words} words >= ${tc.minWords})`);
      }
    } catch (err) {
      failures++;
      console.log(`  ❌ [FAIL] Network/Fetch error: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Fallback transparency check
  // ─────────────────────────────────────────────────────────
  console.log("\n[TC-11] Domain Fallback Transparency Check");
  const fallbackCheck = await fetch(`${API_BASE}/api/chatbot/health`);
  const healthData = await fallbackCheck.json();
  ok(fallbackCheck.status === 200, "Health check endpoint responsive");
  ok(healthData.groqConfigured === true, "Groq cloud integration active in health status");

  // Latency metrics
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];

  console.log("\n=======================================================");
  console.log(" AI PERFORMANCE & QUALITY BENCHMARK SUMMARY");
  console.log("=======================================================");
  console.log(` Total Checks : ${passes + failures} assertions`);
  console.log(` Passed       : ${passes}`);
  console.log(` Failed       : ${failures}`);
  console.log(` Average      : ${avg} ms`);
  console.log(` Median (p50) : ${p50} ms`);
  console.log(` 95th % (p95) : ${p95} ms`);
  console.log("=======================================================\n");

  process.exit(failures > 0 ? 1 : 0);
}

runEvaluation();
