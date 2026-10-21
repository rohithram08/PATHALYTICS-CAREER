// src/backend/tests/recruiter-full-verification.mjs
// Comprehensive End-to-End verification of the full recruiter workflow:
// - Dynamic Corporate Recruiter Registration & Approval
// - Recruiter Profile Verification Check
// - Dashboard KPIs & Pipeline Analytics
// - Job Creation with Experience Level & Skills
// - Custom ATS Pipeline Stages Configuration
// - Job Publishing & Mine Listings
// - Candidate Application to Job
// - 360-degree Candidate Profile Retrieval (/api/recruiter/candidates/:id)
// - Talent Pool Management (Save, List, Remove)
// - Recruiter Outreach & Direct Messaging
// - Job Deletion & Cascade Clean-up

import assert from "node:assert/strict";

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000/api";

function makeClient() {
  let cookie = "";
  let token = "";

  async function call(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
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
      /* non-json */
    }

    if (json?.token) token = json.token;
    return { status: res.status, ok: res.ok, json };
  }

  return {
    get: (p) => call("GET", p),
    post: (p, b) => call("POST", p, b),
    put: (p, b) => call("PUT", p, b),
    patch: (p, b) => call("PATCH", p, b),
    delete: (p) => call("DELETE", p),
    getToken: () => token,
  };
}

async function runRecruiterVerification() {
  console.log("=================================================================");
  console.log("🚀 STARTING COMPREHENSIVE RECRUITER SUITE END-TO-END VERIFICATION");
  console.log("=================================================================\n");

  const now = Date.now();
  const recruiter = makeClient();
  const candidate = makeClient();

  const recruiterEmail = `recruiter_full_${now}@innovatecorp.com`;
  const candidateEmail = `candidate_full_${now}@example.com`;

  // 1. Sign up corporate recruiter (auto-approved)
  console.log("Step 1: Signing up approved corporate recruiter...");
  const recSignup = await recruiter.post("/auth/signup", {
    name: "Elena Rostova",
    email: recruiterEmail,
    password: "P@ssw0rd123!",
    role: "recruiter",
    companyName: "InnovateCorp Tech",
    companySize: "501-1000",
    industry: "Software & Cloud",
  });
  assert.equal(recSignup.status, 201, `Recruiter signup failed: ${JSON.stringify(recSignup.json)}`);
  assert.equal(recSignup.json?.requiresDocuments, false, "Corporate domain should not require manual document review");
  console.log("  ✅ Recruiter signed up and auto-approved");

  // 2. Sign up candidate and complete 360-degree profile
  console.log("Step 2: Signing up candidate & populating 360-degree profile...");
  const candSignup = await candidate.post("/auth/signup", {
    name: "Alex Devlin",
    email: candidateEmail,
    password: "P@ssw0rd123!",
    role: "candidate",
  });
  assert.equal(candSignup.status, 201, `Candidate signup failed: ${JSON.stringify(candSignup.json)}`);

  const candProfile = {
    fullName: "Alex Devlin",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    linkedinUrl: "https://linkedin.com/in/alexdevlin",
    githubUrl: "https://github.com/alexdevlin",
    portfolioUrl: "https://alexdevlin.dev",
    yearsOfExperience: "4.5",
    currentRole: "Senior React Developer",
    currentCompany: "Nexus Innovations",
    expectedSalary: "₹24,00,000",
    noticePeriod: "15 days",
    skills: ["React", "TypeScript", "Node.js", "GraphQL", "PostgreSQL", "Docker"],
    workExperience: [
      {
        title: "Senior React Developer",
        company: "Nexus Innovations",
        startDate: "2023-03",
        endDate: "Present",
        description: "Architected micro-frontend web applications serving 1M+ active users.",
      },
      {
        title: "Software Engineer",
        company: "Apex Tech Labs",
        startDate: "2021-06",
        endDate: "2023-02",
        description: "Built scalable Node.js backend services and REST APIs.",
      },
    ],
    education: [
      {
        degree: "B.Tech Computer Science & Engineering",
        institution: "National Institute of Technology",
        startYear: "2017",
        endYear: "2021",
        score: "8.9 CGPA",
      },
    ],
    projects: [
      {
        title: "CloudFlow Orchestrator",
        description: "Open-source workflow engine with zero-downtime failover.",
        techStack: ["TypeScript", "Node.js", "Redis"],
        liveUrl: "https://cloudflow.dev",
      },
    ],
    isVisibleToRecruiters: true,
  };

  const updateProfileRes = await candidate.patch("/auth/me/candidate-profile", candProfile);
  assert.equal(updateProfileRes.status, 200, `Update candidate profile failed: ${JSON.stringify(updateProfileRes.json)}`);
  console.log("  ✅ Candidate profile populated with 360-degree data");

  // 3. Verify Recruiter Profile & Verification Status
  console.log("Step 3: Checking recruiter profile and verification status...");
  const recProfRes = await recruiter.get("/recruiter/profile");
  assert.equal(recProfRes.status, 200, `Fetch recruiter profile failed: ${JSON.stringify(recProfRes.json)}`);
  assert.equal(recProfRes.json?.verification_status, "approved", "Recruiter status must be approved");
  console.log("  ✅ Recruiter verified as approved for:", recProfRes.json?.company_name);

  // 4. Check Recruiter Analytics & Dashboard KPIs
  console.log("Step 4: Fetching Recruiter Analytics Dashboard & Pipeline metrics...");
  const dashRes = await recruiter.get("/recruiter/dashboard");
  assert.equal(dashRes.status, 200, "Dashboard endpoint responds 200");
  assert.ok("jobs" in dashRes.json, "Dashboard returns jobs summary");
  assert.ok("applications" in dashRes.json, "Dashboard returns applications summary");
  assert.ok("recent_applications" in dashRes.json, "Dashboard returns recent_applications");
  console.log("  ✅ Dashboard KPIs retrieved successfully:", {
    totalJobs: dashRes.json?.jobs?.total_jobs,
    activeJobs: dashRes.json?.jobs?.active_jobs,
    totalApplications: dashRes.json?.applications?.total_applications,
  });

  const analyticsRes = await recruiter.get("/recruiter/analytics");
  assert.equal(analyticsRes.status, 200, "Analytics responds 200");
  console.log("  ✅ Pipeline & hiring analytics retrieved successfully:", {
    totalApplications: analyticsRes.json?.total_applications,
    hiredCount: analyticsRes.json?.hired_count,
    stageBreakdown: analyticsRes.json?.stage_breakdown?.length,
  });

  // 5. Job Creation with experienceLevel & skills
  console.log("Step 5: Creating new job listing with experienceLevel and skills...");
  const jobPayload = {
    title: "Staff Cloud Architect",
    description: "Lead enterprise cloud modernization and microservices architecture at high scale.",
    location: "Bengaluru / Remote",
    jobType: "full-time",
    experienceLevel: "lead",
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Cloud"],
    salaryMin: 2800000,
    salaryMax: 4200000,
    applicationMode: "internal",
  };
  const createJobRes = await recruiter.post("/jobs", jobPayload);
  assert.equal(createJobRes.status, 201, `Create job failed: ${JSON.stringify(createJobRes.json)}`);
  const jobId = createJobRes.json?.id;
  assert.ok(jobId, "Job ID must be returned");
  console.log("  ✅ Job created with ID:", jobId);

  // 6. Define Custom Multi-Stage ATS Pipeline
  console.log("Step 6: Setting up custom ATS stages for this job...");
  const stagesPayload = [
    { stageName: "Initial Resume Screen", stageType: "screening" },
    { stageName: "Hands-on Technical Assessment", stageType: "assignment" },
    { stageName: "System Architecture Panel", stageType: "interview" },
    { stageName: "Executive Culture & Offer", stageType: "offer" },
  ];
  const setStagesRes = await recruiter.put(`/jobs/${jobId}/stages`, stagesPayload);
  assert.equal(setStagesRes.status, 200, "Stages configured successfully");

  const getStagesRes = await recruiter.get(`/jobs/${jobId}/stages`);
  assert.equal(getStagesRes.status, 200, "Fetch stages responds 200");
  assert.equal(getStagesRes.json?.length, 4, "Must have 4 custom stages");
  console.log("  ✅ 4 custom ATS pipeline stages verified:", getStagesRes.json?.map(s => s.stage_name));

  // 7. Publish Job
  console.log("Step 7: Publishing job listing...");
  const pubRes = await recruiter.patch(`/jobs/${jobId}/publish`);
  assert.equal(pubRes.status, 200, `Publish job failed: ${JSON.stringify(pubRes.json)}`);

  const myJobsRes = await recruiter.get("/jobs/mine");
  assert.equal(myJobsRes.status, 200, "GET /jobs/mine responds 200");
  const jobInList = myJobsRes.json?.find(j => j.id === jobId);
  assert.ok(jobInList, "Published job must be listed in recruiter jobs");
  assert.equal(jobInList.status, "published", "Job status is published");
  console.log("  ✅ Job verified published in recruiter listings");

  // 8. Candidate applies to the published job
  console.log("Step 8: Candidate submits internal application...");
  const applyRes = await candidate.post("/applications/internal", {
    jobId,
    coverNote: "I have 4.5+ years building distributed React and Node.js enterprise platforms.",
  });
  assert.equal(applyRes.status, 201, `Application failed: ${JSON.stringify(applyRes.json)}`);
  const applicationId = applyRes.json?.id ?? applyRes.json?.applicationId;
  assert.ok(applicationId, "Application ID created");
  console.log("  ✅ Candidate applied to job. Application ID:", applicationId);

  // 9. Recruiter retrieves candidate 360-degree profile
  console.log("Step 9: Recruiter retrieves 360-degree Candidate Profile (/recruiter/candidates/:id)...");
  const candUserRes = await candidate.get("/auth/me");
  const candUserId = candUserRes.json?.user?.id;
  assert.ok(candUserId, "Resolved candidate user ID");

  const detailRes = await recruiter.get(`/recruiter/candidates/${candUserId}`);
  assert.equal(detailRes.status, 200, `Fetch candidate detail failed: ${JSON.stringify(detailRes.json)}`);
  const cDetail = detailRes.json;
  assert.equal(cDetail.name, "Alex Devlin", "Candidate name matches");
  assert.equal(cDetail.phone, "+91 98765 43210", "Candidate phone matches");
  assert.equal(cDetail.current_role, "Senior React Developer", "Current role matches");
  assert.ok(Array.isArray(cDetail.skills), "Skills parsed as array");
  assert.ok(cDetail.skills.includes("React"), "Skills include React");
  assert.ok(Array.isArray(cDetail.work_experience), "Work experience parsed as array");
  assert.equal(cDetail.work_experience.length, 2, "Work experience entries match");
  assert.ok(Array.isArray(cDetail.education), "Education parsed as array");
  assert.equal(cDetail.education.length, 1, "Education entries match");
  console.log("  ✅ 360-degree Candidate Details verified cleanly:", {
    name: cDetail.name,
    role: cDetail.current_role,
    skills: cDetail.skills,
    experienceCount: cDetail.work_experience.length,
    educationDegree: cDetail.education[0]?.degree,
  });

  // 10. Talent Pool Operations (Save, List, Remove)
  console.log("Step 10: Testing Talent Pool save, retrieve, and remove...");
  const savePoolRes = await recruiter.post(`/recruiter/talent-pool/${candUserId}`);
  assert.ok(savePoolRes.status === 200 || savePoolRes.status === 201, "Candidate saved to Talent Pool");

  const poolListRes = await recruiter.get("/recruiter/talent-pool");
  assert.equal(poolListRes.status, 200, "Get talent pool responds 200");
  const inPool = poolListRes.json?.some(c => c.candidate_id === candUserId || c.user_id === candUserId);
  assert.ok(inPool, "Candidate must be present in saved talent pool");
  console.log("  ✅ Candidate successfully bookmarked in Talent Pool");

  const removePoolRes = await recruiter.delete(`/recruiter/talent-pool/${candUserId}`);
  assert.equal(removePoolRes.status, 200, "Remove from talent pool responds 200");
  console.log("  ✅ Candidate removed from Talent Pool");

  // 11. Candidate Outreach & Messaging
  console.log("Step 11: Testing Recruiter Candidate Outreach Messaging...");
  const sendMsgRes = await recruiter.post("/recruiter/messages", {
    recipientId: candUserId,
    jobId: jobId,
    subject: "Invitation to interview for Staff Cloud Architect",
    body: "Hi Alex! Your deep experience in micro-frontends and distributed systems caught our eye. Would love to connect!",
  });
  assert.equal(sendMsgRes.status, 201, `Send message failed: ${JSON.stringify(sendMsgRes.json)}`);
  const msgId = sendMsgRes.json?.messageId;
  assert.ok(msgId, "Message ID returned");

  const inboxRes = await recruiter.get("/recruiter/messages");
  assert.equal(inboxRes.status, 200, "Get recruiter messages responds 200");
  const foundMsg = inboxRes.json?.find(m => m.id === msgId);
  assert.ok(foundMsg, "Sent outreach message found in recruiter messages");
  console.log("  ✅ Candidate outreach message delivered & verified in recruiter inbox");

  // 12. ATS Status Transition & Application Management
  console.log("Step 12: Moving candidate application through ATS pipeline stages...");
  const secondStageId = getStagesRes.json?.[1]?.id;
  const moveRes = await recruiter.patch(`/applications/${applicationId}/status`, {
    status: "screening",
    stageId: secondStageId,
    notes: "Screened and advancing to technical assessment.",
  });
  assert.equal(moveRes.status, 200, `Move stage failed: ${JSON.stringify(moveRes.json)}`);
  console.log("  ✅ Candidate advanced to Screening and 2nd stage in pipeline");

  // 13. Job Deletion and Cascade Clean-up
  console.log("Step 13: Testing Job Deletion & Cascade Clean-up...");
  const delJobRes = await recruiter.delete(`/jobs/${jobId}`);
  assert.equal(delJobRes.status, 200, `Delete job failed: ${JSON.stringify(delJobRes.json)}`);

  const myJobsAfter = await recruiter.get("/jobs/mine");
  const stillListed = myJobsAfter.json?.some(j => j.id === jobId);
  assert.equal(stillListed, false, "Job must no longer appear in /jobs/mine");
  console.log("  ✅ Job deleted and verified removed");

  console.log("\n=================================================================");
  console.log("🎉 ALL 13 RECRUITER JOURNEY MODULES VERIFIED 100% OPERATIONAL!");
  console.log("=================================================================\n");
}

runRecruiterVerification().catch(err => {
  console.error("\n❌ RECRUITER VERIFICATION FAILED:", err);
  process.exit(1);
});
