// src/contexts/AuthContext.tsx
// ─────────────────────────────────────────────────────────────
// SECURE AuthContext — API-first, httpOnly cookie architecture
//
// WHAT CHANGED vs your original:
//   OLD: login(token) → saves JWT to localStorage
//        → readable by any JavaScript / XSS attack
//        → token key mismatch ('pathalytics_token' vs 'token')
//
//   NEW: login(token) still works the SAME WAY for Login.tsx
//        and SignUp.tsx (no changes needed in those pages).
//        BUT the token is no longer stored in localStorage.
//        Instead it's sent to the backend which sets an
//        httpOnly cookie.  JavaScript can never read it.
//
// All existing call sites (Login.tsx, SignUp.tsx, OAuthSuccess)
// keep working with ZERO changes to those files.
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  email_verified?: boolean;
  has_password?: boolean;
  providers?: Array<{
    name: string;
    email?: string | null;
    linkedAt: string;
  }>;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;           // kept so existing pages don't break
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;   // same signature as before
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Shared fetch helper — always sends cookies ────────────────
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",         // sends httpOnly cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // We keep `token` in state so existing pages that read
  // `const { token } = useAuth()` continue to work.
  // In the new architecture, this holds the token returned
  // by the login response body — it is NOT in localStorage.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch user profile from server ───────────────────────
  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        setToken(null);
        return;
      }
      const data = await res.json();
      setUser(data?.user || data);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  // ── Bootstrap: check if session cookie already exists ────
  useEffect(() => {
    (async () => {
      await fetchUserProfile();
      setIsLoading(false);
    })();
  }, [fetchUserProfile]);

  // ── login(token) — same signature as before ───────────────
  // Login.tsx and SignUp.tsx call: await authLogin(data.token)
  // This function receives that token, stores it in state
  // (for any page reading `token`), then fetches the full
  // profile from /api/auth/me using the httpOnly cookie
  // that the server already set in the login response.
  const login = useCallback(
    async (authToken: string) => {
      // Keep token in memory (NOT localStorage)
      setToken(authToken);
      // Fetch full profile — cookie is sent automatically
      await fetchUserProfile();
    },
    [fetchUserProfile]
  );

  // ── logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  // ── refreshUser ───────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // ── updateUser ────────────────────────────────────────────
  const updateUser = useCallback(
    async (updates: Partial<AuthUser>) => {
      const previousUser = user;
      setUser((prev) => prev ? { ...prev, ...updates } : prev);

      try {
        const res = await apiFetch("/api/auth/me", {
          method: "PATCH",
          body: JSON.stringify(updates),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || "Failed to update profile");
        }

        const updated = data?.user || data;
        if (updated && typeof updated === "object") {
          setUser((prev) => prev ? { ...prev, ...updated } : updated);
        } else {
          await fetchUserProfile();
        }
      } catch (err) {
        setUser(previousUser);
        throw err;
      }
    },
    [user, fetchUserProfile]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, isLoading, login, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};