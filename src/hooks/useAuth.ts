// src/hooks/useAuth.ts

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
  verification_status?: "pending" | "verified" | "rejected"; // ← needed for isVerifiedRecruiter
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  isRecruiter: boolean;
  isVerifiedRecruiter: boolean; // ← added
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

// ── Context ───────────────────────────────────────────────────
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

  const isAuthenticated: boolean     = !isLoading && user !== null;
  const isRecruiter: boolean         = user?.role === "recruiter" || user?.role === "admin";
  const isAdmin: boolean             = user?.role === "admin";
  // Admins are always considered verified; recruiters need verification_status === "verified"
  const isVerifiedRecruiter: boolean = user?.role === "admin" ||
    (user?.role === "recruiter" && user?.verification_status === "verified");

  const value: AuthContextType = {
    user,
    isLoading,
    loading: isLoading,
    isAuthenticated,
    isRecruiter,
    isVerifiedRecruiter, // ← exposed
    isAdmin,
    login,
    logout,
    refresh,
    setUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be called inside <AuthProvider>");
  return ctx;
}

export default useAuth;