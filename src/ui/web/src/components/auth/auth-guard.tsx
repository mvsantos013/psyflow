import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { type AuthRole, type AuthSession } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

type AuthGuardProps = {
  children: (session: AuthSession) => React.ReactNode;
  loadingFallback?: React.ReactNode;
  requiredRole?: AuthRole;
  forbiddenFallback?: React.ReactNode;
};

function defaultLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Carregando sessão...
    </div>
  );
}

export function AuthGuard({
  children,
  loadingFallback,
  requiredRole,
  forbiddenFallback,
}: AuthGuardProps) {
  const { status, session } = useAuth();
  const redirectPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  useEffect(() => {
    if (status !== "unauthenticated" || typeof window === "undefined") {
      return;
    }

    const target = encodeURIComponent(redirectPath || "/dashboard");
    window.location.replace(`/login?redirect=${target}`);
  }, [status, redirectPath]);

  if (status === "loading") {
    return loadingFallback ?? defaultLoadingFallback();
  }

  if (!session) {
    return null;
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return forbiddenFallback ?? null;
  }

  return <>{children(session)}</>;
}