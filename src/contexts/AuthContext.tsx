import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { api } from "@/lib/api";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface User {
  id: number;
  name: string;
  email: string;
  company_id?: number;
  role?: string;
  two_factor_enabled?: boolean;
  is_shared_account?: boolean;
  display_name?: string | null;
  company_name?: string;
  company_lifecycle_status?: "active" | "read_only" | "archived" | "pending_deletion";
  company_read_only_until?: string | null;
  company_archive_opt_in?: boolean;
  company_archive_until?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, displayName?: string) => Promise<{ user: User; token: string; display_name?: string | null }>;
  setSession: (user: User, token: string, displayName?: string | null) => void;
  logout: () => void;
}


const AuthContext = createContext<AuthContextType | null>(null);

const hasLifecycleData = (user: User | null) => Boolean(
  user && (user.company_lifecycle_status || user.company_read_only_until || typeof user.company_archive_opt_in === "boolean")
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    api.setToken(null);
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!sessionStorage.getItem("auth_token")) return;
    inactivityTimer.current = setTimeout(() => {
      performLogout();
      window.location.href = "/login";
    }, INACTIVITY_TIMEOUT_MS);
  }, [performLogout]);

  const syncCurrentUser = useCallback(async () => {
    const res = await api.me();
    let savedDisplayName: string | null = null;
    try {
      savedDisplayName = (JSON.parse(sessionStorage.getItem("auth_user") || "{}") as User).display_name ?? null;
    } catch {
      savedDisplayName = null;
    }
    const userWithDisplay = savedDisplayName && !res.user?.display_name
      ? { ...res.user, display_name: savedDisplayName }
      : res.user;
    setUser(userWithDisplay);
    sessionStorage.setItem("auth_user", JSON.stringify(userWithDisplay));
    return userWithDisplay;
  }, []);

  // Listen for user activity
  useEffect(() => {
    if (!token) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset < 30_000) return; // throttle to every 30s
      lastReset = now;
      resetInactivityTimer();
    };

    events.forEach((e) => window.addEventListener(e, throttledReset, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, throttledReset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, resetInactivityTimer]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const savedToken = sessionStorage.getItem("auth_token");
      const savedUser = sessionStorage.getItem("auth_user");

      if (!savedToken || !savedUser) {
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setToken(savedToken);
        setUser(parsedUser);
        api.setToken(savedToken);

        if (!hasLifecycleData(parsedUser)) {
          const freshUser = await syncCurrentUser();
          if (cancelled) return;
          setUser(freshUser);
        }
      } catch {
        if (!cancelled) performLogout();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [performLogout, syncCurrentUser]);

  const setSession = useCallback((u: User, t: string, displayName?: string | null) => {
    const userWithDisplay = displayName ? { ...u, display_name: displayName } : u;
    setUser(userWithDisplay);
    setToken(t);
    api.setToken(t);
    sessionStorage.setItem("auth_token", t);
    sessionStorage.setItem("auth_user", JSON.stringify(userWithDisplay));

    if (!hasLifecycleData(userWithDisplay)) {
      void syncCurrentUser().catch(() => undefined);
    }
  }, [syncCurrentUser]);

  const login = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await api.login({ email, password, ...(displayName ? { display_name: displayName } : {}) });
    return res;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, setSession, logout: performLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
