import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowRight, Brain, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNewPasswordRequiredError } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function resolveRedirectTarget(): string {
  if (typeof window === "undefined") return "/dashboard";
  const searchParams = new URLSearchParams(window.location.search);
  const redirect = searchParams.get("redirect")?.trim();
  if (!redirect || !redirect.startsWith("/")) {
    return "/dashboard";
  }
  return redirect;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function LoginPage() {
  const { status, login, completeNewPassword } = useAuth();
  const redirectTarget = useMemo(() => resolveRedirectTarget(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [challenge, setChallenge] = useState<{ username: string; challengeSession: string } | null>(
    null,
  );
  const [showLottie, setShowLottie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !submitting && typeof window !== "undefined") {
      window.location.replace(redirectTarget);
    }
  }, [status, submitting, redirectTarget]);

  useEffect(() => {
    setShowLottie(true);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const minDuration = delay(3000);
    let redirecting = false;

    try {
      if (challenge) {
        if (newPassword.length < 10) {
          setError("A nova senha deve ter pelo menos 10 caracteres.");
          return;
        }

        if (newPassword !== newPasswordConfirm) {
          setError("A confirmação da senha não confere.");
          return;
        }

        await Promise.all([
          completeNewPassword({
            username: challenge.username,
            newPassword,
            challengeSession: challenge.challengeSession,
          }),
          minDuration,
        ]);
        redirecting = true;
        window.location.replace(redirectTarget);
        return;
      }

      await Promise.all([login({ email, password }), minDuration]);
      redirecting = true;
      window.location.replace(redirectTarget);
    } catch (submitError) {
      if (isNewPasswordRequiredError(submitError)) {
        await minDuration;
        setChallenge({
          username: submitError.username,
          challengeSession: submitError.challengeSession,
        });
        setPassword("");
        setError(null);
        return;
      }

      await minDuration;

      const message = submitError instanceof Error ? submitError.message : "Falha ao autenticar.";
      setError(message);
    } finally {
      if (!redirecting) {
        setSubmitting(false);
      }
    }
  }

  const submitContent = submitting ? "Entrando..." : challenge ? "Salvar nova senha" : "Entrar";

  const isLoadingState = submitting || status === "loading";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-104 w-104 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-56 -right-56 h-120 w-120 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0/0.65),transparent_50%),radial-gradient(circle_at_80%_80%,oklch(1_0_0/0.4),transparent_45%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity duration-300 hover:opacity-85"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">PsyFlow</div>
              <div className="text-xs text-muted-foreground">
                Plataforma para cuidado inteligente
              </div>
            </div>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Conexão protegida e dados criptografados
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <Card className="border-border/70 bg-card/85 backdrop-blur-xl shadow-2xl shadow-primary/8 transition-all duration-500 animate-in fade-in-0 slide-in-from-left-2">
            <CardHeader>
              <CardTitle className="text-3xl tracking-tight">
                {challenge ? "Defina uma nova senha" : "Bem-vinda de volta"}
              </CardTitle>
              <CardDescription className="max-w-prose text-sm leading-relaxed">
                {challenge
                  ? "Seu acesso requer atualização de segurança. Defina uma nova senha para seguir ao painel clínico."
                  : "Entre com suas credenciais para continuar com sua rotina de gerenciamento de atendimentos."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                {challenge ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="challenge-username">Usuário</Label>
                      <Input
                        id="challenge-username"
                        type="text"
                        value={challenge.username}
                        readOnly
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Minimo de 10 caracteres"
                        autoComplete="new-password"
                        className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
                      <Input
                        id="new-password-confirm"
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(event) => setNewPasswordConfirm(event.target.value)}
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@clinica.com"
                        autoComplete="email"
                        className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="********"
                        autoComplete="current-password"
                        className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60"
                        required
                      />
                    </div>
                  </>
                )}

                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="group w-full gap-1.5 transition-all duration-200"
                  disabled={submitting}
                >
                  {submitContent}
                  {!submitting ? (
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  ) : null}
                </Button>

                {challenge ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setChallenge(null);
                      setNewPassword("");
                      setNewPasswordConfirm("");
                      setError(null);
                    }}
                  >
                    Voltar para login
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/65 p-6 backdrop-blur-xl shadow-xl shadow-chart-2/10 transition-all duration-500 animate-in fade-in-0 slide-in-from-right-3">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-chart-2/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative mb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                PsyFlow
              </p>
              <h3 className="text-2xl font-semibold tracking-tight">
                Cuidado contínuo com tecnologia humana
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Centralize informações clínicas, acompanhe evolução dos pacientes e mantenha sua
                equipe conectada com segurança.
              </p>
            </div>

            <div className="relative rounded-lg border border-border/70 bg-background/85 p-2">
              {showLottie ? (
                <DotLottieReact
                  src={isLoadingState ? "/images/loading.lottie" : "/images/login.lottie"}
                  autoplay
                  loop={!isLoadingState}
                  className="h-70 w-full rounded-md sm:h-80"
                />
              ) : (
                <div className="flex h-70 w-full items-center justify-center rounded-md bg-secondary/35 sm:h-80">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="relative mt-4 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              Seu ambiente foi preparado para acesso rápido e protegido. Todos os dados sensíveis de
              pacientes são criptografados.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
