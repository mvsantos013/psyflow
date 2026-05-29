import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  clearStoredSession,
  completeNewPasswordChallenge,
  ensureValidSession,
  getMsUntilSessionExpiry,
  loginWithPassword,
  refreshSession,
  type AuthSession,
} from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  login: (params: { email: string; password: string }) => Promise<AuthSession>;
  completeNewPassword: (params: {
    username: string;
    newPassword: string;
    challengeSession: string;
  }) => Promise<AuthSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const UNAUTHORIZED_EVENT = "psyflow:auth:unauthorized";

type UnauthorizedReason = "unauthorized" | "forbidden";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const lastToastAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const restored = await ensureValidSession();
      if (cancelled) return;
      setSession(restored);
      setStatus(restored ? "authenticated" : "unauthenticated");
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  const showAuthToast = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastToastAtRef.current < 2500) {
      return;
    }
    lastToastAtRef.current = now;
    toast.error(message);
  }, []);

  const invalidateSession = useCallback((message?: string) => {
    clearStoredSession();
    setSession(null);
    setStatus("unauthenticated");
    if (message) {
      showAuthToast(message);
    }
  }, [showAuthToast]);

  const logout = useCallback(() => {
    invalidateSession();
  }, [invalidateSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: UnauthorizedReason }>;
      const reason = customEvent.detail?.reason;
      const message =
        reason === "forbidden"
          ? "Seu perfil nao tem permissao para esta acao."
          : "Sua sessao expirou. Entre novamente.";
      invalidateSession(message);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [invalidateSession]);

  useEffect(() => {
    if (typeof window === "undefined" || !session) {
      return;
    }

    const delay = Math.max(getMsUntilSessionExpiry(session) - 60_000, 0);

    const timer = window.setTimeout(async () => {
      const refreshed = await refreshSession();
      if (refreshed) {
        setSession(refreshed);
        setStatus("authenticated");
        return;
      }

      invalidateSession("Sua sessao expirou. Entre novamente.");
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [session, invalidateSession]);

  const login = useCallback(async (params: { email: string; password: string }) => {
    const nextSession = await loginWithPassword(params);
    setSession(nextSession);
    setStatus("authenticated");
    return nextSession;
  }, []);

  const completeNewPassword = useCallback(
    async (params: { username: string; newPassword: string; challengeSession: string }) => {
      const nextSession = await completeNewPasswordChallenge(params);
      setSession(nextSession);
      setStatus("authenticated");
      return nextSession;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      login,
      completeNewPassword,
      logout,
    }),
    [status, session, login, completeNewPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
