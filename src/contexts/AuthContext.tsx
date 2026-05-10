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
  avatar?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseJwt = (token: string): Record<string, any> | null => {
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
    id: payload.id || payload.userId || payload.sub,
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
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Unable to fetch profile");
        }

        const data = await res.json();
        const profile = data?.user || data;

        setUser((prev) => ({
          ...prev,
          ...profile,
        }));
      } catch {
        const decodedUser = getUserFromToken(authToken);
        setUser(decodedUser);
      }
    },
    []
  );

  const login = useCallback(
    async (authToken: string) => {
      localStorage.setItem(TOKEN_KEY, authToken);
      setToken(authToken);

      const decodedUser = getUserFromToken(authToken);
      setUser(decodedUser);

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

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
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
