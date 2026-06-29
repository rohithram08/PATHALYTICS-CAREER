// src/hooks/useAuth.ts
// ─────────────────────────────────────────────────────────────
// Thin hook wrapper around the real AuthContext.
//
// AuthProvider + AuthContext live in src/contexts/AuthContext.tsx
// and are already wired into App.tsx. This file just exposes
// the useAuth() hook so pages can call it without importing
// useContext + AuthContext themselves every time.
// ─────────────────────────────────────────────────────────────
import { useContext } from "react";
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext";

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}

// Named re-exports so files that import { AuthUser } from "@/hooks/useAuth"
// keep working without changes.
export type { AuthUser, AuthContextType } from "@/contexts/AuthContext";

export default useAuth;