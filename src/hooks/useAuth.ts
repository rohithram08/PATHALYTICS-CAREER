// src/hooks/useAuth.ts
// ─────────────────────────────────────────────────────────────
// FIX: Added ": AuthContextType" return type annotation.
//
// WHY authLogin (and everything from useAuth) showed red:
//
//   AuthContext was created with:
//     createContext<AuthContextType | undefined>(undefined)
//
//   So useContext(AuthContext) returns: AuthContextType | undefined
//
//   Even though useAuth() throws when context is undefined,
//   TypeScript doesn't know that — it still thinks the return
//   type is "AuthContextType | undefined".
//
//   So when you write:
//     const { login: authLogin } = useAuth()
//
//   TypeScript thinks authLogin might be undefined, so:
//     await authLogin("")   ← red: "Cannot invoke undefined"
//     await logout()        ← red: same reason
//     await refreshUser()   ← red: same reason
//
// THE FIX: Tell TypeScript "this function ALWAYS returns
//   AuthContextType, never undefined" by adding the return type.
//   The explicit ": AuthContextType" return type annotation
//   combined with the throw makes TypeScript understand that
//   if we get past the throw, context is definitely defined.
// ─────────────────────────────────────────────────────────────

import { useContext } from "react";
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};