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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; token: string }>;
  setSession: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
    const savedToken = sessionStorage.getItem("auth_token");
    const savedUser = sessionStorage.getItem("auth_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      api.setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  const setSession = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    api.setToken(t);
    sessionStorage.setItem("auth_token", t);
    sessionStorage.setItem("auth_user", JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
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
