// src/contexts/AuthContext.tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "pathalytics_token";

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
  // ✅ Added — required for Settings and ChangePassword pages
  email_verified?: boolean;
  has_password?: boolean;
  providers?: Array<{
    name: string;
    email?: string | null;
    linkedAt: string;
  }>;
  // Recruiter-only fields — undefined for ordinary users
  companyTier?: "top" | "mid" | "low";
  verificationStatus?: "pending" | "approved" | "rejected";
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRecruiter: boolean;
  isVerifiedRecruiter: boolean;
  login: (token: string, extraUserData?: Partial<AuthUser>) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Describes the claims our backend puts in the JWT — no `any` needed.
interface JwtPayload {
  id?: number;
  userId?: number;
  sub?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  profilePicture?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  [key: string]: unknown; // allow other standard JWT claims
}

const parseJwt = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getUserFromToken = (token: string): AuthUser | null => {
  const payload = parseJwt(token);
  if (!payload) return null;

  return {
    // payload.id / userId are numbers in our DB; AuthUser.id is string
    id: (payload.id ?? payload.userId)?.toString() ?? payload.sub,
    name: payload.name || payload.fullName || "",
    email: payload.email || "",
    role: payload.role || "user",
    createdAt: payload.createdAt || undefined,
    updatedAt: payload.updatedAt || undefined,
    avatar: payload.avatar || payload.profilePicture || "",
    phone: payload.phone || "",
    bio: payload.bio || "",
    location: payload.location || "",
    website: payload.website || "",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchUserProfile = useCallback(
    async (authToken: string) => {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include", // cookie rides along as a backup to the header
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      } catch {
        // Network-level failure (offline, backend cold-starting, etc.) is not
        // proof the token is invalid — keep the user signed in using what the
        // token itself tells us rather than logging them out over a blip.
        setUser(getUserFromToken(authToken));
        return;
      }

      if (res.status === 401) {
        // The backend explicitly said this token is dead (expired/invalid).
        // Previously this case fell into the same catch-all as a network
        // error and just kept showing stale decoded-token data — the user
        // looked "logged in" while every real API call kept 401ing under
        // them. Log out for real instead.
        clearAuth();
        return;
      }

      if (!res.ok) {
        // Some other server-side hiccup (500, a bad response mid cold-start).
        // Not proof the token is invalid either, so don't force a logout.
        setUser(getUserFromToken(authToken));
        return;
      }

      try {
        const data = await res.json();
        const profile = data?.user || data;

        // If recruiter, also pull fresh verification status so the route guard
        // picks up admin approvals without requiring a re-login.
        let recruiterData: Partial<AuthUser> = {};
        if (profile.role === "recruiter") {
          try {
            const rRes = await fetch(`${API_URL}/api/recruiter/profile`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${authToken}` },
            });
            if (rRes.ok) {
              const rData = await rRes.json();
              recruiterData = {
                companyTier: rData.company_tier,
                verificationStatus: rData.verification_status,
              };
            }
          } catch { /* non-fatal — fall through with profile only */ }
        }

        setUser((prev) => ({
          ...prev,
          ...profile,
          role: profile.role ?? prev?.role,
          ...recruiterData,
        }));
      } catch {
        setUser(getUserFromToken(authToken));
      }
    },
    [clearAuth]
  );

  const login = useCallback(
    async (authToken: string, extraUserData?: Partial<AuthUser>) => {
      localStorage.setItem(TOKEN_KEY, authToken);
      setToken(authToken);

      const decodedUser = getUserFromToken(authToken);
      // Merge any extra fields from the login response (e.g. companyTier,
      // verificationStatus) that aren't in the JWT payload.
      setUser({ ...decodedUser, ...extraUserData });

      await fetchUserProfile(authToken);
    },
    [fetchUserProfile]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    await fetchUserProfile(token);
  }, [fetchUserProfile, token]);

  const updateUser = useCallback(
    async (updates: Partial<AuthUser>) => {
      if (!token) {
        throw new Error("You are not authenticated");
      }

      const previousUser = user;

      setUser((prev) => ({
        ...prev,
        ...updates,
      }));

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Failed to update profile");
        }

        const updatedProfile = data?.user || data;

        if (updatedProfile && typeof updatedProfile === "object") {
          setUser((prev) => ({
            ...prev,
            ...updatedProfile,
          }));
        } else {
          await refreshUser();
        }
      } catch (error) {
        setUser(previousUser);
        throw error;
      }
    },
    [token, user, refreshUser]
  );

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);

      const decodedUser = getUserFromToken(storedToken);
      setUser(decodedUser);

      try {
        await fetchUserProfile(storedToken);
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [clearAuth, fetchUserProfile]);

  // src/lib/api.ts dispatches this on every 401 it sees from any endpoint.
  // Previously nothing listened for it, so a token that died mid-session
  // (expired, revoked, etc.) only got caught the next time the page was
  // reloaded — until then the UI kept acting as if the user was still
  // logged in while every api.ts call quietly failed.
  useEffect(() => {
    const handleUnauthorized = () => clearAuth();
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [clearAuth]);

  const isRecruiter = user?.role === "recruiter";
  const isVerifiedRecruiter = isRecruiter && user?.verificationStatus === "approved";

  const value = useMemo(
    () => ({
      user,
      token,
      // !!token alone breaks OAuth sign-in: OAuthSuccess.tsx intentionally
      // has no JWT to store client-side (the backend only sets an httpOnly
      // cookie for that flow, by design — see routes/oauth.js), so relying
      // on token truthiness left OAuth users looking "signed in" for one
      // frame and then bounced straight back to /login by every guard.
      // A populated user object (fetched via the cookie) is just as valid
      // a signal that the session is real.
      isAuthenticated: !!token || !!user,
      isLoading,
      isRecruiter,
      isVerifiedRecruiter,
      login,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, isLoading, isRecruiter, isVerifiedRecruiter, login, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};