// src/lib/api.ts
// ─────────────────────────────────────────────────────────────
// API client — sends BOTH the httpOnly cookie and an Authorization
// header, and doesn't depend on either one exclusively.
//
// Why both: this app's frontend (Vercel) and backend (Render) are on
// different domains, so every request between them is cross-site.
// A cross-site cookie only survives if it's set with SameSite=None
// (now fixed backend-side in routes/auth.js / oauth.js), and even
// then it's one more thing that can silently break (browser privacy
// settings, third-party-cookie blocking, etc). The Authorization
// header has no such caveats — it's just a value we attach ourselves
// — so it's the reliable primary path; the cookie rides along as a
// backup. The backend's requireAuth already checks the cookie first
// and falls back to the header (src/backend/middleware/auth.js), so
// sending both is always safe and never ambiguous.
//
// This also fixes the earlier split-brain bug where this file was
// cookie-only while src/contexts/AuthContext.tsx was header-only —
// two auth systems that didn't talk to each other. Both now read the
// same localStorage token, so a signed-in user works no matter which
// of the two calls a given page happens to use.
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "pathalytics_token"; // must match AuthContext.tsx's TOKEN_KEY

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
  email_verified?: boolean;
  has_password?: boolean;
  providers?: Array<{
    name: string;
    email?: string | null;
    linkedAt: string;
  }>;
  createdAt?: string;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ── Core request function ─────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const callerHeaders = (options.headers as Record<string, string>) || {};

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",           // cookie, when it survives the trip
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // reliable primary path
      ...callerHeaders,
    },
  });

  // Handle 401 — session expired or not logged in
  if (res.status === 401) {
    // Dispatch a custom event so AuthContext can react
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      (data as { message?: string })?.message || `HTTP ${res.status}`,
      res.status,
      data
    );
  }

  return data as T;
}

// ── Upload with progress ────────────────────────────────────────
// A second primitive alongside request() above, not a replacement — XHR
// gives real upload-progress events (xhr.upload.onprogress), which fetch()
// still doesn't expose cleanly. Mirrors request()'s auth/credentials/401
// handling as closely as XHR allows. Content-Type is deliberately never
// set here: the browser generates the multipart/form-data boundary itself
// when XHR sends a FormData body, and setting the header manually strips
// that boundary and breaks the upload.
function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${endpoint}`);
    xhr.withCredentials = true; // cookie, when it survives the trip — same as request()
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`); // reliable primary path — same as request()

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        reject(new ApiError("Session expired. Please log in again.", 401));
        return;
      }
      let data: unknown = {};
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch { /* non-JSON body */ }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        reject(
          new ApiError(
            (data as { message?: string })?.message || `HTTP ${xhr.status}`,
            xhr.status,
            data
          )
        );
      }
    };

    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.send(formData);
  });
}

// ── Typed HTTP methods ────────────────────────────────────────
export const api = {
  get:   <T>(path: string)                   => request<T>(path),
  post:  <T>(path: string, body?: unknown)   => request<T>(path, { method: "POST",   body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown)   => request<T>(path, { method: "PATCH",  body: body ? JSON.stringify(body) : undefined }),
  put:   <T>(path: string, body?: unknown)   => request<T>(path, { method: "PUT",    body: body ? JSON.stringify(body) : undefined }),
  del:   <T>(path: string)                   => request<T>(path, { method: "DELETE" }),
  uploadWithProgress,
};

// ── Auth-specific API calls ───────────────────────────────────
export const authApi = {
  // Login: server sets httpOnly cookie, returns user object
  login: (email: string, password: string) =>
    api.post<{ user: ApiUser }>("/api/auth/login", { email, password }),

  // Signup: creates account (no auto-login)
  signup: (name: string, email: string, password: string) =>
    api.post<{ message: string }>("/api/auth/signup", { name, email, password }),

  // Get current user (uses cookie automatically)
  me: () => api.get<{ user: ApiUser }>("/api/auth/me"),

  // Update profile
  updateMe: (data: Partial<Pick<ApiUser, "name" | "avatar">>) =>
    api.patch<{ user: ApiUser }>("/api/auth/me", data),

  // Unlink OAuth provider
  unlinkProvider: (provider: string) =>
    api.del<{ message: string }>(`/api/auth/providers/${provider}`),

  // Password management
  setPassword:    (password: string)                              => api.post<{ message: string }>("/api/auth/set-password", { password }),
  changePassword: (currentPassword: string, newPassword: string) => api.post<{ message: string }>("/api/auth/change-password", { currentPassword, newPassword }),
  forgotPassword: (email: string)                                 => api.post<{ message: string }>("/api/auth/forgot-password", { email }),
  resetPassword:  (email: string, otp: string, newPassword: string) => api.post<{ message: string }>("/api/auth/reset-password", { email, otp, newPassword }),

  // Logout: clears server cookie
  logout: () => api.post<{ message: string }>("/api/auth/logout"),

  // Delete account
  deleteMe: () => api.del<{ message: string }>("/api/auth/me"),
};

// ── Jobs API — calls your secure backend proxy ────────────────
export const jobsApi = {
  search: (params: {
    what?: string;
    where?: string;
    results?: number;
    page?: number;
    sort_by?: "relevance" | "date" | "salary";
  }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return api.get<{
      count: number;
      results: Array<{
        id: string;
        title: string;
        description: string;
        company: string;
        location: string;
        salary_min: number | null;
        salary_max: number | null;
        created: string;
        redirect_url: string;
        category: string;
      }>;
    }>(`/api/jobs?${qs.toString()}`);
  },
};

// ── Chatbot API ───────────────────────────────────────────────
export const chatApi = {
  send: (message: string, conversationId?: string) =>
    api.post<{ response: string; conversation_id: string }>(
      "/api/chatbot/chat",
      { message, conversation_id: conversationId }
    ),
};

// ── Recruiter API ─────────────────────────────────────────────
// Centralizes what was previously ~26 separate inline fetch() calls
// scattered across src/pages/recruiter/*.tsx, each re-implementing the
// token/credentials/error-handling boilerplate `request()` above already
// provides. Migrating incrementally (P1.1) — see
// PATHALYTICS_ENGINEERING_STATE.md for what's covered so far and what's
// still using raw fetch().
//
// Note: this app currently has two parallel sets of recruiter-facing
// backend routes that both remain live — /api/jobs/* + /api/applications/*
// (used by ManageJobs/PostJob/EditJob/ApplicationsReview/CandidatesList)
// and /api/recruiter/* (used by RecruiterDashboard/RecruiterAnalytics/
// RecruiterCandidates/RecruiterJobForm/RecruiterProfileSetup). This client
// wraps each exactly as it exists today rather than picking one —
// consolidating them is a backend decision outside P1.1's scope, flagged
// separately in the engineering state doc.

export interface RecruiterDashboardData {
  jobs: { total_jobs: number; active_jobs: number; closed_jobs: number };
  applications: {
    total_applications: number;
    screening: number;
    interviews: number;
    offers: number;
    hired: number;
    rejected: number;
  };
  views: { total_views: number };
  trend: Array<{ day: string; count: number }>;
  recent_applications: Array<{
    id: number;
    stage: string;
    created_at: string;
    candidate_name: string;
    candidate_email: string;
    job_title: string;
  }>;
}

export interface RecruiterJobSummary {
  id: number;
  title: string;
  location: string;
  job_type: string;
  status: "draft" | "published" | "closed";
  application_mode: "internal" | "external";
  applicant_count: number;
  created_at: string;
  published_at: string | null;
}

export interface RecruiterJobDetail {
  title: string;
  description: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  application_mode: string;
  external_apply_url: string | null;
  status: "draft" | "published" | "closed";
  // The handler does `SELECT * FROM jobs` (via requireOwnJob), so the
  // real response has more than EditJob.tsx originally used — these three
  // were added in P1.1 batch 4 so RecruiterJobForm.tsx could reuse this
  // same, already-ownership-verified endpoint instead of the nonexistent
  // GET /api/recruiter/jobs/:id it was calling before.
  experience_level: string | null;
  skills: string | string[]; // raw JSON string as stored; parse before use
  closed_at: string | null;
}

export interface RecruiterProfile {
  company_name: string;
  company_size: string;
  industry: string;
  designation: string;
  // The wire format's real key is `company_website` (backend schema/
  // column name, unchanged) — this app-level type keeps `website` since
  // that's what RecruiterProfileSetup.tsx's UI state has always used.
  // recruiterApi.profile.get()/update() translate between the two; the
  // rest of the app never needs to know the wire name differs. Fixed in
  // P1.1 stabilization — see profile.get/update comments below.
  website: string;
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason?: string;
}

export interface RecruiterDocument {
  id: number;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  status: "pending" | "verified" | "rejected";
  rejection_reason?: string;
}

// Shape sent to POST /api/jobs and PATCH /api/jobs/:id. salaryMin/Max
// optionality intentionally loose (undefined for create, null for update
// are both used by different callers today) rather than forcing the two
// call sites into an artificial shared convention that isn't there yet.
export interface RecruiterJobInput {
  title: string;
  description: string;
  location: string;
  jobType: string;
  experienceLevel?: string;
  skills?: string[] | string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  applicationMode: string;
  externalApplyUrl?: string;
}

export interface RecruiterCandidateDetail {
  application_id: number;
  stage: string;
  notes: string | null;
  applied_at: string;
  resume_storage_key: string | null;
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  job_id: number;
  job_title: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  years_of_experience?: string | null;
  current_role?: string | null;
  current_company?: string | null;
  expected_salary?: string | null;
  notice_period?: string | null;
  skills?: string[];
  work_experience?: Array<{ title: string; company: string; startDate: string; endDate?: string; description?: string }>;
  education?: Array<{ degree: string; institution: string; startYear?: string; endYear?: string }>;
  projects?: Array<{ title: string; description?: string; url?: string; techStack?: string }>;
}

export interface RecruiterJobStage {
  id: number;
  stage_name: string;
  stage_type: string;
}

export interface RecruiterJobStageInput {
  stageName: string;
  stageType: string;
}

export interface RecruiterCandidate {
  id: number;
  name: string;
  location: string | null;
  current_role: string | null;
  current_company: string | null;
  years_of_experience: string | null;
  skills: string[];
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  notice_period: string | null;
  expected_salary: string | null;
  // only present in match results
  matchedSkills?: string[];
  score?: number;
}

export interface RecruiterApplicant {
  id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
  current_stage_id: number | null;
  current_stage_name: string | null;
  applied_at: string;
  resume_storage_key: string | null;
  cover_note: string | null;
}

export interface RecruiterTalentPoolEntry {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  notes: string | null;
  saved_at: string;
}

export interface RecruiterMessage {
  id: number;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  recipient_name: string;
  recipient_email: string;
}

export interface RecruiterAnalyticsData {
  funnel: Array<{ stage: string; count: number }>;
  dailyApps: Array<{ date: string; count: number }>;
  topJobs: Array<{ id: number; title: string; applications: number; views: number }>;
  timeToHire: { avg_days: number | null };
}

// Kanban/pipeline-mode candidate shape — RecruiterCandidates.tsx. A
// different response shape from RecruiterCandidate above even though
// both come from GET /api/recruiter/candidates: the backend branches on
// presence of a `page` param (self-documented in recruiter.js as debt
// worth splitting into two routes later).
export interface RecruiterPipelineCandidate {
  application_id: number;
  user_id: number;
  name: string;
  email: string;
  avatar_url?: string;
  stage: string;
  applied_at: string;
  job_title: string;
  job_id: number;
}

// recruiter.js's OWN separate jobs implementation — /api/recruiter/jobs/*
// (create/update only, see recruiterJobs below), used only by
// RecruiterJobForm.tsx. Different field names/response shape from `jobs`
// above (which is /api/jobs/*, used by ManageJobs/PostJob/EditJob).
// FIXED in P1.1 batch 4: this used to also have a .get(id), but
// GET /api/recruiter/jobs/:id (single-job fetch) does not exist on the
// backend — only GET /api/recruiter/jobs (list) and PUT/POST for
// create/update do. RecruiterJobForm.tsx's edit-mode load now reuses
// jobs.get() (GET /api/jobs/:id, jobs.js) instead — that route already
// does the exact ownership check needed (SELECT * + recruiter_id match)
// and happens to return every column RecruiterJobForm needs, just under
// different field names; RecruiterJobForm.tsx maps between the two.
export interface RecruiterJobsAltDetail {
  title: string;
  description: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string;
  experience_level: string;
  deadline: string | null;
  is_active: number;
  skills: string[] | string;
}

export interface RecruiterJobsAltInput {
  title: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string;
  experience_level?: string;
  deadline?: string;
  is_active: boolean;
  skills: string[];
}

export const recruiterApi = {
  dashboard: {
    // GET /api/recruiter/dashboard — recruiter.js
    get: () => api.get<RecruiterDashboardData>("/api/recruiter/dashboard"),
  },

  // /api/jobs/* — jobs.js (the ManageJobs/PostJob/EditJob surface; see
  // note above re: the separate /api/recruiter/jobs/* implementation).
  jobs: {
    mine:    () => api.get<RecruiterJobSummary[]>("/api/jobs/mine"),
    get:     (id: number | string) => api.get<RecruiterJobDetail>(`/api/jobs/${id}`),
    create:  (body: RecruiterJobInput) => api.post<{ id: number }>("/api/jobs", body),
    update:  (id: number | string, body: RecruiterJobInput) => api.patch<{ message: string }>(`/api/jobs/${id}`, body),
    publish: (id: number | string) => api.patch<{ message: string }>(`/api/jobs/${id}/publish`),
    close:   (id: number | string) => api.patch<{ message: string }>(`/api/jobs/${id}/close`),
    delete:  (id: number | string) => api.del<{ message: string }>(`/api/jobs/${id}`),
    stages: {
      get:    (id: number | string) => api.get<RecruiterJobStage[]>(`/api/jobs/${id}/stages`),
      update: (id: number | string, stages: RecruiterJobStageInput[]) =>
        api.put<{ message: string }>(`/api/jobs/${id}/stages`, stages),
    },
  },

  // /api/recruiter/candidates* — recruiter.js
  candidates: {
    get: (id: number | string) =>
      api.get<RecruiterCandidateDetail>(`/api/recruiter/candidates/${id}`),
    browse: (params: { search?: string; skill?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.skill) qs.set("skill", params.skill);
      return api.get<RecruiterCandidate[]>(`/api/recruiter/candidates?${qs.toString()}`);
    },
    match: (jobId: number | string) =>
      api.get<{ candidates: RecruiterCandidate[]; job: { title: string } }>(
        `/api/recruiter/candidates/match/${jobId}`
      ),
    // Kanban/pipeline mode — same URL as browse() above, different query
    // params and a wrapped response (see RecruiterPipelineCandidate note).
    pipeline: (params: { q?: string; stage?: string; page?: number; limit?: number } = {}) => {
      const qs = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 30),
      });
      if (params.q) qs.set("q", params.q);
      if (params.stage) qs.set("stage", params.stage);
      return api.get<{ candidates: RecruiterPipelineCandidate[]; total: number }>(
        `/api/recruiter/candidates?${qs.toString()}`
      );
    },
    // updateStage removed in P1.2: POST /api/recruiter/candidates/:id/status
    // was one of two competing application-status endpoints. Consolidated
    // onto applications.updateStatus() below — RecruiterCandidates.tsx now
    // calls that directly with { status: stage }.
  },

  // /api/applications/* — applications.js. Canonical application-status
  // API as of P1.2 (consolidated from two competing endpoints — see
  // PATHALYTICS_ENGINEERING_STATE.md). status/stageId/notes are each
  // independently optional; the backend requires at least one.
  applications: {
    byJob: (jobId: number | string) =>
      api.get<RecruiterApplicant[]>(`/api/applications/job/${jobId}`),
    updateStatus: (
      appId: number | string,
      payload: { status?: string; stageId?: number; notes?: string }
    ) =>
      api.patch<{ status: string; stageName?: string; message?: string }>(
        `/api/applications/${appId}/status`,
        payload
      ),
  },

  // /api/recruiter/talent-pool* — recruiter.js. No frontend consumer
  // exists yet (checked repo-wide) — added proactively so this surface
  // is ready whenever a talent-pool UI is built, matching the rest of
  // the centralized client rather than leaving it for someone to
  // rediscover and re-implement with raw fetch() later.
  talentPool: {
    list: () => api.get<RecruiterTalentPoolEntry[]>("/api/recruiter/talent-pool"),
    save: (userId: number | string, notes?: string) =>
      api.post<{ message: string }>(`/api/recruiter/talent-pool/${userId}`, { notes }),
    remove: (userId: number | string) =>
      api.del<{ message: string }>(`/api/recruiter/talent-pool/${userId}`),
  },

  // /api/recruiter/messages — recruiter.js. Same situation as talentPool:
  // no frontend consumer exists yet, added proactively.
  messages: {
    list: () => api.get<RecruiterMessage[]>("/api/recruiter/messages"),
    send: (recipientId: number | string, subject: string, body: string) =>
      api.post<{ message: string }>("/api/recruiter/messages", {
        recipient_id: recipientId,
        subject,
        body,
      }),
  },

  analytics: {
    get: (days: number | string = 30) =>
      api.get<RecruiterAnalyticsData>(`/api/recruiter/analytics?days=${days}`),
  },

  // The separate /api/recruiter/jobs/* surface — create/update only.
  // Fixed in P1.1 batch 4: a .get(id) used to live here wrapping
  // GET /api/recruiter/jobs/:id, which does not exist on the backend —
  // removed rather than left as dead/misleading code (see
  // RecruiterJobsAltDetail's comment and jobs.get below for the fix).
  recruiterJobs: {
    create: (body: RecruiterJobsAltInput) =>
      api.post<{ message: string; id?: number }>("/api/recruiter/jobs", body),
    update: (id: number | string, body: RecruiterJobsAltInput) =>
      api.put<{ message: string }>(`/api/recruiter/jobs/${id}`, body),
  },

  // /api/recruiter/profile — recruiter.js
  profile: {
    // GET returns the raw wire shape (company_website); translate to this
    // app's `website` key here so every consumer just sees RecruiterProfile.
    get: async (): Promise<RecruiterProfile> => {
      const raw = await api.get<Record<string, unknown>>("/api/recruiter/profile");
      const { company_website, ...rest } = raw;
      return { ...rest, website: (company_website as string) ?? "" } as RecruiterProfile;
    },
    // Fixed in P1.1 batch 4: was sending PATCH, backend only ever
    // registered PUT — every save 404'd. Fixed in P1.1 stabilization:
    // the backend's Zod schema expects `company_website`, not `website`
    // (Zod silently drops unrecognized keys rather than erroring, so the
    // field looked like it saved but never actually persisted). Backend
    // contract left untouched on purpose — translated at this boundary
    // instead, same as get() above, so RecruiterProfileSetup.tsx and its
    // `website` field/state need no changes at all.
    update: (payload: {
      company_name: string;
      company_size: string;
      industry: string;
      designation: string;
      website: string;
    }) => {
      const { website, ...rest } = payload;
      return api.put<{ message: string }>("/api/recruiter/profile", {
        ...rest,
        company_website: website,
      });
    },
  },

  // /api/recruiter/documents* — recruiter.js
  documents: {
    list: () => api.get<RecruiterDocument[]>("/api/recruiter/documents"),
    delete: (id: number) => api.del<{ message: string }>(`/api/recruiter/documents/${id}`),
    upload: (file: File, documentType: string, onProgress?: (percent: number) => void) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("document_type", documentType);
      return api.uploadWithProgress<{ message: string; id: number }>(
        "/api/recruiter/documents/upload",
        formData,
        onProgress
      );
    },
  },
};

export { API_URL };