// src/backend/tests/live-e2e-verification.mjs
// Run against live local server on http://localhost:4000

const BASE = "http://localhost:4000";
let passes = 0, failures = 0;

function ok(cond, label, extra = "") {
  if (cond) {
    passes++;
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.log(`  ❌ ${label} ${extra}`);
  }
}

function makeClient() {
  let token = "";
  let cookie = "";

  async function call(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (cookie) headers["Cookie"] = cookie;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];

    let json = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }
    return { status: res.status, json, headers: res.headers };
  }

  return {
    setToken: (t) => { token = t; },
    getToken: () => token,
    get: (p) => call("GET", p),
    post: (p, b) => call("POST", p, b),
    put: (p, b) => call("PUT", p, b),
    patch: (p, b) => call("PATCH", p, b),
    del: (p) => call("DELETE", p),
  };
}

async function runVerification() {
  console.log("\n=======================================================");
  console.log(" PATHALYTICS PHASE 3 — LIVE END-TO-END VERIFICATION");
  console.log("=======================================================\n");

  // ── 1. Server Health ─────────────────────────────────────────
  console.log("— 1. Server Health & Connectivity —");
  {
    const r = await fetch(`${BASE}/api/health`);
    const data = await r.json();
    ok(r.status === 200, "GET /api/health → 200");
    ok(data.status === "ok", "System status is 'ok'");
  }

  // ── 2. Verified Job Seeker Persona ───────────────────────────
  console.log("\n— 2. Verified Job Seeker Workflow —");
  const seeker = makeClient();
  const seekerEmail = "test.jobseeker.verified@pathalytics.test";
  const seekerPass = process.env.TEST_PERSONA_VERIFIED_JOBSEEKER_PASSWORD;

  {
    const r = await seeker.post("/api/auth/login", {
      email: seekerEmail,
      password: seekerPass,
    });
    ok(r.status === 200, "Verified Job Seeker login → 200");
    ok(!!r.json?.token, "Received authentication token");
    if (r.json?.token) seeker.setToken(r.json.token);
  }

  {
    const r = await seeker.get("/api/me");
    ok(r.status === 200, "GET /api/me → 200");
    const u = r.json?.user || r.json;
    ok(u?.role === "user", "Role is 'user'");
    ok(u?.email_verified === 1 || u?.email_verified === true, "email_verified is true");
  }

  {
    const r = await seeker.get("/api/user/stats");
    ok(r.status === 200, "GET /api/user/stats → 200");
    ok(typeof r.json?.profile_completion === "number", "profile_completion metric returned");
  }

  // ── 3. Unverified Job Seeker Persona ─────────────────────────
  console.log("\n— 3. Unverified Job Seeker Workflow —");
  const unverifiedSeeker = makeClient();
  const unverifiedSeekerEmail = "test.jobseeker.unverified@pathalytics.test";
  const unverifiedSeekerPass = process.env.TEST_PERSONA_UNVERIFIED_JOBSEEKER_PASSWORD;

  {
    const r = await unverifiedSeeker.post("/api/auth/login", {
      email: unverifiedSeekerEmail,
      password: unverifiedSeekerPass,
    });
    ok(r.status === 200, "Unverified Job Seeker login → 200");
    if (r.json?.token) unverifiedSeeker.setToken(r.json.token);
  }

  {
    const r = await unverifiedSeeker.get("/api/me");
    ok(r.status === 200, "GET /api/me → 200");
    const u = r.json?.user || r.json;
    ok(u?.email_verified === 0 || u?.email_verified === false, "email_verified is false");
  }

  // ── 4. Verified Recruiter Persona ────────────────────────────
  console.log("\n— 4. Verified Recruiter Lifecycle & Job Management —");
  const recruiter = makeClient();
  const recruiterEmail = "test.recruiter.verified@pathalytics.test";
  const recruiterPass = process.env.TEST_PERSONA_VERIFIED_RECRUITER_PASSWORD;

  {
    const r = await recruiter.post("/api/auth/login", {
      email: recruiterEmail,
      password: recruiterPass,
    });
    ok(r.status === 200, "Verified Recruiter login → 200");
    if (r.json?.token) recruiter.setToken(r.json.token);
  }

  {
    const r = await recruiter.get("/api/recruiter/profile");
    ok(r.status === 200, "GET /api/recruiter/profile → 200");
    ok(r.json?.verification_status === "approved", "verification_status is 'approved'");
  }

  let createdJobId = null;
  {
    const r = await recruiter.post("/api/recruiter/jobs", {
      title: "Senior Full-Stack Engineer (Live Test)",
      description: "Comprehensive full stack testing role for platform verification.",
      location: "Remote",
      employment_type: "full-time",
      experience_level: "senior",
      is_active: false, // draft
    });
    ok(r.status === 201, "POST /api/recruiter/jobs (draft) → 201");
    createdJobId = r.json?.id;
    ok(!!createdJobId, `Created draft job with id ${createdJobId}`);
  }

  if (createdJobId) {
    const r = await recruiter.put(`/api/recruiter/jobs/${createdJobId}`, {
      title: "Lead Full-Stack Engineer (Updated Test)",
    });
    ok(r.status === 200, `PUT /api/recruiter/jobs/${createdJobId} → 200`);

    const del = await recruiter.del(`/api/recruiter/jobs/${createdJobId}`);
    ok(del.status === 200, `DELETE /api/recruiter/jobs/${createdJobId} → 200`);
  }

  // ── 5. Unverified Recruiter Restriction Gates ────────────────
  console.log("\n— 5. Unverified Recruiter Restriction Gates —");
  const unverifiedRecruiter = makeClient();
  const unverifiedRecruiterEmail = "test.recruiter.unverified@pathalytics.test";
  const unverifiedRecruiterPass = process.env.TEST_PERSONA_UNVERIFIED_RECRUITER_PASSWORD;

  {
    const r = await unverifiedRecruiter.post("/api/auth/login", {
      email: unverifiedRecruiterEmail,
      password: unverifiedRecruiterPass,
    });
    ok(r.status === 200, "Unverified Recruiter login → 200");
    if (r.json?.token) unverifiedRecruiter.setToken(r.json.token);
  }

  {
    const r = await unverifiedRecruiter.get("/api/recruiter/profile");
    ok(r.status === 200, "GET /api/recruiter/profile → 200");
    ok(r.json?.verification_status === "pending", "verification_status is 'pending'");
  }

  {
    // Attempting to publish an active job without verification must be blocked
    const r = await unverifiedRecruiter.post("/api/recruiter/jobs", {
      title: "Unverified Active Posting Attempt",
      description: "This posting should be blocked because the recruiter is unverified.",
      is_active: true,
    });
    ok(r.status === 403, "Publishing active job without verification → 403 Blocked");
  }

  // ── 6. Security Boundaries & IDOR Controls ───────────────────
  console.log("\n— 6. Security Boundaries & IDOR Prevention —");
  {
    // Candidate attempting to access Recruiter routes
    const r = await seeker.get("/api/recruiter/jobs");
    ok(r.status === 403, "Candidate accessing recruiter route → 403 Forbidden");
  }

  {
    // Candidate attempting to access Admin routes
    const r = await seeker.get("/api/admin/verifications");
    ok(r.status === 403, "Candidate accessing admin route → 403 Forbidden");
  }

  {
    // Recruiter attempting to access Admin routes
    const r = await recruiter.get("/api/admin/verifications");
    ok(r.status === 403, "Recruiter accessing admin route → 403 Forbidden");
  }

  // ── 7. AI Gateway Validation ─────────────────────────────────
  console.log("\n— 7. AI Gateway Multi-Tier Live Validation —");
  {
    const r = await seeker.post("/api/chatbot/chat", {
      message: "Explain the purpose of Docker in microservices architecture.",
    });
    ok(r.status === 200, "POST /api/chatbot/chat → 200");
    ok(r.json?.status === "ok", "Response status is 'ok'");
    ok(r.json?.provider === "groq_direct" || r.json?.provider === "domain_engine", `Provider resolved: ${r.json?.provider}`);
    ok(typeof r.json?.reply === "string" && r.json.reply.length > 20, "Non-empty educational reply returned");
  }

  {
    // Malformed request validation
    const r = await seeker.post("/api/chatbot/chat", {
      // missing 'message'
      current_page: "/roadmaps",
    });
    ok(r.status === 400, "Malformed chat payload rejected with 400 Bad Request");
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n=======================================================");
  console.log(` RESULTS: ${passes} Passed, ${failures} Failed`);
  console.log("=======================================================\n");

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("FATAL ERROR in verification script:", err);
  process.exit(1);
});
