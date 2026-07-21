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

// ── Typed HTTP methods ────────────────────────────────────────
export const api = {
  get:   <T>(path: string)                   => request<T>(path),
  post:  <T>(path: string, body?: unknown)   => request<T>(path, { method: "POST",   body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown)   => request<T>(path, { method: "PATCH",  body: body ? JSON.stringify(body) : undefined }),
  put:   <T>(path: string, body?: unknown)   => request<T>(path, { method: "PUT",    body: body ? JSON.stringify(body) : undefined }),
  del:   <T>(path: string)                   => request<T>(path, { method: "DELETE" }),
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

export { API_URL };