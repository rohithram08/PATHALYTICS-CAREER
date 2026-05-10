// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL;

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  email_verified?: boolean;
  has_password?: boolean;
  providers?: Array<{
    name: string;
    linkedAt: string;
  }>;
  created_at?: string;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const getToken = () => localStorage.getItem("token");

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || `HTTP ${res.status}`, res.status, data);
  }

  return data as T;
}

// ============ Generic helpers ============
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ============ Auth API ============
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: ApiUser }>("/api/auth/login", {
      email,
      password,
    }),

  signup: (name: string, email: string, password: string) =>
    api.post<{ message: string; accountLinked?: boolean }>(
      "/api/auth/signup",
      { name, email, password }
    ),

  me: () => api.get<{ user: ApiUser }>("/api/auth/me"),

  updateMe: (data: Partial<Pick<ApiUser, "name" | "avatar_url">>) =>
    api.patch<{ user: ApiUser }>("/api/auth/me", data),

  unlinkProvider: (provider: string) =>
    api.del<{ message: string }>(`/api/auth/providers/${provider}`),
};

export { API_URL };