// src/hooks/useAuth.ts
// ─────────────────────────────────────────────────────────────
// Drop this file in as a complete replacement.
// Select All (Ctrl+A) in VS Code → Delete → Paste.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "recruiter" | "admin" | "mentor";
  avatar_url?: string;
  bio?: string;
  email_verified?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  isRecruiter: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

// ── Context — defined right here, not imported from elsewhere ─
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/me`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data: AuthUser = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { message?: string; user?: AuthUser };
      if (!res.ok) throw new Error(data.message ?? "Login failed");
      if (data.user) setUser(data.user);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated: boolean = !isLoading && user !== null;
  const isRecruiter: boolean =
    user?.role === "recruiter" || user?.role === "admin";
  const isAdmin: boolean = user?.role === "admin";

  const value: AuthContextType = {
    user,
    isLoading,
    loading: isLoading,
    isAuthenticated,
    isRecruiter,
    isAdmin,
    login,
    logout,
    refresh,
    setUser,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}

export default useAuth;