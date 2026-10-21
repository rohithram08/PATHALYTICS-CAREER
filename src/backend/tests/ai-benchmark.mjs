// src/backend/tests/ai-benchmark.mjs
async function testAI() {
  const prompts = [
    {
      name: "Career Guidance",
      message: "I am a second-year CS student with Python and SQL. What are 3 actionable milestones to become a Data Engineer by graduation?",
      expectJson: false,
    },
    {
      name: "Out-of-Domain Safety Check",
      message: "Give me the recipe for chocolate chip cookies with 2 cups flour.",
      expectJson: false,
    },
    {
      name: "Interview Question Generation",
      message: "You are a technical interviewer. Ask one interview question for a Backend Engineer role focusing on database indexing.",
      expectJson: false,
    },
    {
      name: "Interview Answer Evaluation",
      message: "Evaluate the candidate's answer. Question: Explain indexing. Candidate answer: 'Indexes use B-trees so the database searches in O(log n) time without full table scans, but add write overhead.' Output strict JSON with keys: score (0-100), feedback (string).",
      expectJson: true,
    },
  ];

  console.log("=======================================================");
  console.log(" AI GATEWAY LIVE QUALITY & LATENCY EVALUATION");
  console.log("=======================================================\n");

  const results = [];

  for (const p of prompts) {
    const t0 = Date.now();
    const res = await fetch("http://localhost:4000/api/chatbot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: p.message, user_level: "intermediate" }),
    });
    const dur = Date.now() - t0;
    const data = await res.json();
    let jsonValid = false;
    let score = null;

    if (p.expectJson) {
      try {
        const cleaned = data.reply.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        jsonValid = typeof parsed.score === "number" && typeof parsed.feedback === "string";
        score = parsed.score;
      } catch {
        jsonValid = false;
      }
    }

    results.push({
      name: p.name,
      latencyMs: dur,
      status: res.status,
      provider: data.provider,
      isFallback: !!data.is_fallback,
      replyPreview: data.reply ? data.reply.slice(0, 150).replace(/\n/g, " ") : "",
      jsonValid: p.expectJson ? jsonValid : "N/A",
      evalScore: score,
    });
  }

  for (const r of results) {
    console.log(`[${r.name}]`);
    console.log(`  Latency: ${r.latencyMs}ms | Provider: ${r.provider} | HTTP: ${r.status}`);
    console.log(`  Sample: "${r.replyPreview}..."`);
    if (r.jsonValid !== "N/A") {
      console.log(`  Structured Output Valid: ${r.jsonValid} (Score: ${r.evalScore})`);
    }
    console.log("");
  }

  const latencies = results.map((r) => r.latencyMs);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  console.log("-------------------------------------------------------");
  console.log(`Average Latency: ${avg}ms (Min: ${Math.min(...latencies)}ms, Max: ${Math.max(...latencies)}ms)`);
  console.log("-------------------------------------------------------");
}

testAI().catch(console.error);
