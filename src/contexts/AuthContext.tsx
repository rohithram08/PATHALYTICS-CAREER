// src/contexts/AuthContext.tsx
// ─────────────────────────────────────────────────────────────
// SECURE AuthContext — API-first architecture
//
// KEY CHANGES vs old version:
//
//   OLD (insecure):
//     - Stored JWT in localStorage('pathalytics_token')
//     - localStorage is readable by ANY JavaScript on the page
//     - XSS attack → attacker reads token → steals session
//     - Token key mismatch: AuthContext used 'pathalytics_token'
//       but api.ts read 'token' → silent auth failures
//
//   NEW (secure):
//     - JWT lives in httpOnly cookie (set by server)
//     - JavaScript CANNOT read httpOnly cookies at all
//     - Frontend never touches the raw token
//     - "Are you logged in?" = call GET /api/auth/me
//       If it returns 200 → logged in. If 401 → not logged in.
//     - All API calls use { credentials: "include" } so the
//       browser automatically sends the cookie
//
// This is exactly how Netflix, GitHub, and Google do it.
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
  id: string | number;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt?: string;
  email_verified?: boolean;
  has_password?: boolean;
  providers?: Array<{
    name: string;
    email?: string | null;
    linkedAt: string;
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;  // for OAuth flow
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<Pick<AuthUser, "name" | "avatar">>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Fetch helper — always sends cookies ──────────────────────
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",      // ← ALWAYS send httpOnly cookie
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch current user from server ───────────────────────
  const fetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        return false;
      }
      const data = await res.json();
      setUser(data.user || data);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  // ── Bootstrap: check if already logged in ────────────────
  useEffect(() => {
    (async () => {
      await fetchUser();
      setIsLoading(false);
    })();
  }, [fetchUser]);

  // ── Login with email + password ───────────────────────────
  // Server sets httpOnly cookie; we just call /me to get user data
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Cookie is now set by the server.
    // Fetch full profile from /me
    await fetchUser();
  }, [fetchUser]);

  // ── Login with token — used after OAuth redirect ─────────
  // After OAuth, the server already set the cookie.
  // The old code put the token in the URL; now we just call /me.
  const loginWithToken = useCallback(async (_token?: string) => {
    // Token parameter kept for backwards compat but not used —
    // the httpOnly cookie was set by the OAuth callback.
    await fetchUser();
  }, [fetchUser]);

  // ── Logout — clear server cookie ─────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
    }
  }, []);

  // ── Refresh user data from server ────────────────────────
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // ── Update user profile ───────────────────────────────────
  const updateUser = useCallback(
    async (updates: Partial<Pick<AuthUser, "name" | "avatar">>) => {
      const previousUser = user;

      // Optimistic update
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
          await fetchUser();
        }
      } catch (err) {
        // Roll back optimistic update
        setUser(previousUser);
        throw err;
      }
    },
    [user, fetchUser]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithToken,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, isLoading, login, loginWithToken, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};