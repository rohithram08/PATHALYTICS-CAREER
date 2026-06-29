// src/hooks/useAuth.ts
// Re-exports everything App.tsx and all pages need from one place.
// The real implementations live in src/contexts/AuthContext.tsx.

import { useContext } from "react";
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext";

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}

// ── Re-exports so every existing import keeps working ─────────
// App.tsx:          import { AuthProvider } from "@/hooks/useAuth"
// any page:         import { AuthUser }     from "@/hooks/useAuth"
// any page:         import { AuthContextType } from "@/hooks/useAuth"
export { AuthProvider } from "@/contexts/AuthContext";
export type { AuthUser, AuthContextType } from "@/contexts/AuthContext";

export default useAuth;