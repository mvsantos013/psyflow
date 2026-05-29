import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Loader2, ShieldCheck } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && typeof window !== "undefined") {
      window.location.replace(redirectTarget);
    }
  }, [status, redirectTarget]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

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

        await completeNewPassword({
          username: challenge.username,
          newPassword,
          challengeSession: challenge.challengeSession,
        });
        window.location.replace(redirectTarget);
        return;
      }

      await login({ email, password });
      window.location.replace(redirectTarget);
    } catch (submitError) {
      if (isNewPasswordRequiredError(submitError)) {
        setChallenge({
          username: submitError.username,
          challengeSession: submitError.challengeSession,
        });
        setPassword("");
        setError(null);
        return;
      }

      const message = submitError instanceof Error ? submitError.message : "Falha ao autenticar.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const submitContent = submitting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Processando...
    </>
  ) : challenge ? (
    "Salvar nova senha"
  ) : (
    "Entrar"
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">PsyFlow</div>
              <div className="text-xs text-muted-foreground">Acesso da equipe clínica</div>
            </div>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Login com Cognito
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-2xl">
                {challenge ? "Defina uma nova senha" : "Bem-vinda de volta"}
              </CardTitle>
              <CardDescription>
                {challenge
                  ? "Seu usuário está com troca obrigatória de senha. Defina a nova senha para continuar."
                  : "Entre com seu e-mail corporativo e senha para acessar o painel clínico."}
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
                  className="w-full"
                  disabled={submitting || status === "loading"}
                >
                  {submitContent}
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

          <Card className="border-border/70 bg-secondary/20">
            <CardHeader>
              <CardTitle className="text-lg">Configuração necessária</CardTitle>
              <CardDescription>Este login usa Cognito direto do frontend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Defina em ui/.env.local:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>VITE_COGNITO_REGION</li>
                <li>VITE_COGNITO_CLIENT_ID</li>
                <li>VITE_API_BASE_URL</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
