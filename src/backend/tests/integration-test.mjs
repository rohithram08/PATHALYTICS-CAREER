// integration-test.mjs — run against a live local server + DB
const BASE = "http://127.0.0.1:5099";
let failures = 0;
let passes = 0;

function ok(cond, label, extra = "") {
  if (cond) { passes++; console.log(`  ✅ ${label}`); }
  else { failures++; console.log(`  ❌ ${label} ${extra}`); }
}

// Minimal per-user cookie jar since Node's fetch doesn't persist cookies.
function makeClient() {
  let cookie = "";
  async function call(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON response */ }
    return { status: res.status, json };
  }
  return {
    get: (p) => call("GET", p),
    post: (p, b) => call("POST", p, b),
    put: (p, b) => call("PUT", p, b),
    patch: (p, b) => call("PATCH", p, b),
  };
}

async function main() {
  console.log("\n— Health check —");
  {
    const r = await fetch(`${BASE}/api/health`);
    ok(r.status === 200, "GET /api/health → 200");
  }

  console.log("\n— Signup: candidate —");
  const candidate = makeClient();
  const candidateEmail = `candidate_${Date.now()}@example.com`;
  {
    const r = await candidate.post("/api/auth/signup", {
      name: "Test Candidate", email: candidateEmail, password: "P@ssw0rd123",
    });
    ok(r.status === 201, "signup candidate → 201", JSON.stringify(r.json));
    ok(r.json?.requiresEmailVerification === true, "requiresEmailVerification flag present");
  }

  console.log("\n— Signup: recruiter, GENERIC domain (gmail.com) —");
  const recruiterPending = makeClient();
  const recruiterPendingEmail = `recruiter_pending_${Date.now()}@gmail.com`;
  {
    const r = await recruiterPending.post("/api/auth/signup", {
      name: "Pending Recruiter", email: recruiterPendingEmail, password: "P@ssw0rd123",
      role: "recruiter", companyName: "Solo Startup", companySize: "1-10", industry: "Tech",
    });
    ok(r.status === 201, "signup generic-domain recruiter → 201", JSON.stringify(r.json));
    ok(r.json?.requiresDocuments === true, "requiresDocuments === true for generic domain");
  }

  console.log("\n— Signup: recruiter, CORPORATE domain (acmecorp.io) —");
  const recruiterApproved = makeClient();
  const recruiterApprovedEmail = `recruiter_ok_${Date.now()}@acmecorp.io`;
  {
    const r = await recruiterApproved.post("/api/auth/signup", {
      name: "Approved Recruiter", email: recruiterApprovedEmail, password: "P@ssw0rd123",
      role: "recruiter", companyName: "Acme Corp", companySize: "201-500", industry: "Tech",
    });
    ok(r.status === 201, "signup corporate-domain recruiter → 201", JSON.stringify(r.json));
    ok(r.json?.requiresDocuments === false, "requiresDocuments === false for corporate domain");
  }

  console.log("\n— Auth: /api/auth/me and /api/user/me (dual-mount + cookie auth fix) —");
  {
    const r1 = await candidate.get("/api/auth/me");
    ok(r1.status === 200, "GET /api/auth/me (cookie) → 200", JSON.stringify(r1.json));
    ok(r1.json?.user?.email === candidateEmail, "returns correct user via /api/auth/me");

    const r2 = await candidate.get("/api/user/me");
    ok(r2.status === 200, "GET /api/user/me (cookie) → 200", JSON.stringify(r2.json));
  }

  console.log("\n— Candidate profile round-trip (Naukri-style fields) —");
  {
    const payload = {
      fullName: "Test Candidate", location: "Chennai",
      skills: ["React", "Node.js"],
      workExperience: [{ title: "SWE Intern", company: "AVASOFT", startDate: "2025-01", endDate: "2025-06" }],
      education: [{ degree: "B.E. CSE", institution: "PERI Institute of Technology", startYear: "2022", endYear: "2026" }],
      projects: [{ title: "Pathalytics", description: "Career platform", techStack: ["React", "Node"] }],
      preferredLocations: ["Chennai", "Bangalore", "Remote"],
      isVisibleToRecruiters: true,
    };
    const w = await candidate.patch("/api/auth/me/candidate-profile", payload);
    ok(w.status === 200, "PATCH candidate-profile → 200", JSON.stringify(w.json));

    const r = await candidate.get("/api/auth/me/candidate-profile");
    ok(r.status === 200, "GET candidate-profile → 200");
    ok(r.json?.workExperience?.[0]?.company === "AVASOFT", "workExperience round-trips");
    ok(r.json?.education?.[0]?.degree === "B.E. CSE", "education round-trips");
    ok(r.json?.projects?.[0]?.title === "Pathalytics", "projects round-trips");
    ok(JSON.stringify(r.json?.preferredLocations) === JSON.stringify(payload.preferredLocations), "preferredLocations round-trips");
  }

  console.log("\n— Jobs: create + publish (approved recruiter) —");
  let jobId;
  {
    const r = await recruiterApproved.post("/api/jobs", {
      title: "Backend Engineer", description: "Build and maintain our Node.js services with a great team.",
      location: "Chennai", jobType: "full-time", experienceLevel: "entry",
      salaryMin: 600000, salaryMax: 900000, skills: ["Node.js", "MySQL"],
      applicationMode: "internal",
    });
    ok(r.status === 201, "POST /api/jobs → 201", JSON.stringify(r.json));
    jobId = r.json?.id;
    ok(!!jobId, "job id returned");

    const stages = await recruiterApproved.put(`/api/jobs/${jobId}/stages`, [
      { stageName: "Resume Screening", stageType: "screening" },
      { stageName: "Technical Interview", stageType: "interview" },
    ]);
    ok(stages.status === 200, "PUT /api/jobs/:id/stages → 200", JSON.stringify(stages.json));

    const p = await recruiterApproved.patch(`/api/jobs/${jobId}/publish`);
    ok(p.status === 200, "PATCH /api/jobs/:id/publish (approved recruiter) → 200", JSON.stringify(p.json));
  }

  console.log("\n— Jobs: publish blocked for PENDING (unverified) recruiter —");
  {
    const r = await recruiterPending.post("/api/jobs", {
      title: "Junior Dev", description: "Looking for a junior developer to join our small team.",
      location: "Remote", jobType: "full-time", experienceLevel: "entry",
    });
    ok(r.status === 201, "pending recruiter CAN create a draft job → 201");
    const pendingJobId = r.json?.id;

    const p = await recruiterPending.patch(`/api/jobs/${pendingJobId}/publish`);
    ok(p.status === 403, "publish BLOCKED for unverified recruiter → 403", `got ${p.status}: ${JSON.stringify(p.json)}`);
  }

  console.log("\n— Applications: candidate applies to the published job —");
  let applicationId;
  {
    const r = await candidate.post(`/api/applications/internal`, {
      jobId, coverNote: "I would love to work on this team.",
    });
    ok(r.status === 201, "POST /api/applications/internal → 201", JSON.stringify(r.json));
    applicationId = r.json?.id ?? r.json?.applicationId;
  }

  console.log("\n— Recruiter dashboard / candidates / analytics (previously 100% broken: job_postings/stage) —");
  {
    const d = await recruiterApproved.get("/api/recruiter/dashboard");
    ok(d.status === 200, "GET /api/recruiter/dashboard → 200", JSON.stringify(d.json));
    ok(d.json?.jobs?.total_jobs >= 1, "dashboard shows at least 1 job");
    ok(d.json?.applications?.total_applications >= 1, "dashboard shows at least 1 application");

    const c = await recruiterApproved.get("/api/recruiter/candidates?page=1&limit=20");
    ok(c.status === 200, "GET /api/recruiter/candidates (pipeline mode) → 200", JSON.stringify(c.json));
    ok(Array.isArray(c.json?.candidates), "pipeline mode returns {candidates:[...]}");
    if (!applicationId && c.json?.candidates?.[0]) applicationId = c.json.candidates[0].application_id;

    const dir = await recruiterApproved.get("/api/recruiter/candidates?search=Test");
    ok(dir.status === 200, "GET /api/recruiter/candidates (directory mode) → 200", JSON.stringify(dir.json));
    ok(Array.isArray(dir.json), "directory mode returns a raw array");

    const a = await recruiterApproved.get("/api/recruiter/analytics");
    ok(a.status === 200, "GET /api/recruiter/analytics → 200", JSON.stringify(a.json));
  }

  console.log("\n— ATS state machine: invalid vs valid transitions —");
  if (applicationId) {
    const bad = await recruiterApproved.post(`/api/recruiter/candidates/${applicationId}/status`, { stage: "hired" });
    ok(bad.status === 409, "applied → hired directly REJECTED → 409", `got ${bad.status}: ${JSON.stringify(bad.json)}`);

    const okStep1 = await recruiterApproved.post(`/api/recruiter/candidates/${applicationId}/status`, { stage: "screening" });
    ok(okStep1.status === 200, "applied → screening ACCEPTED → 200", JSON.stringify(okStep1.json));

    const okStep2 = await recruiterApproved.post(`/api/recruiter/candidates/${applicationId}/status`, { stage: "hired" });
    ok(okStep2.status === 200, "screening → hired ACCEPTED → 200", JSON.stringify(okStep2.json));

    const terminal = await recruiterApproved.post(`/api/recruiter/candidates/${applicationId}/status`, { stage: "applied" });
    ok(terminal.status === 409, "hired → applied (terminal state) REJECTED → 409", `got ${terminal.status}`);
  } else {
    console.log("  ⚠️  skipped — no applicationId resolved");
  }

  console.log("\n— Escalating OTP resend cooldown —");
  {
    // Signup already issued OTP #1. This call is resend #1, which per the
    // spec's escalating rule ("1st retry = 1-minute wait") should be
    // throttled immediately — proving the cooldown state signup wrote
    // is actually being enforced, not that resends are unthrottled.
    const first = await candidate.post("/api/auth/resend-otp", { email: candidateEmail, purpose: "signup_verify" });
    ok(first.status === 429, "resend right after signup's own OTP → 429 (cooldown from signup enforced)", JSON.stringify(first.json));
    ok(first.json?.retryAfterSeconds > 0 && first.json?.retryAfterSeconds <= 60, "retryAfterSeconds is ~60s (1st retry = 1 minute)", JSON.stringify(first.json));
  }

  console.log(`\n${"=".repeat(50)}\nRESULT: ${passes} passed, ${failures} failed\n${"=".repeat(50)}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
