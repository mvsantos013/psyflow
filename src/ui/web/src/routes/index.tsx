import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ArrowRight, Shield, Mic, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PsyFlow — Dashboard Inteligente para Psicólogos" },
      { name: "description", content: "Dashboard clínico com IA de transcrição, acompanhamento de evolução e prontuário eletrônico inteligente." },
      { property: "og:title", content: "PsyFlow — Dashboard Inteligente para Psicólogos" },
      { property: "og:description", content: "Dashboard clínico com IA de transcrição, acompanhamento de evolução e prontuário eletrônico inteligente." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              PsyFlow
            </span>
          </div>
          <a href="/login">
            <Button variant="outline" className="gap-2">
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Dashboard Inteligente
            <br />
            para Psicólogos
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Acompanhe a evolução dos seus pacientes com prontuários eletrônicos,
            gráficos de humor e transcrição de sessões por IA.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/login">
              <Button size="lg" className="gap-2 px-8">
                Entrar no painel
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
              Recursos do Dashboard
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Gestão de Pacientes",
                  desc: "Lista completa com filtros, status de tratamento e evolução clínica.",
                },
                {
                  icon: Mic,
                  title: "Transcrição IA",
                  desc: "Upload de áudio da sessão e geração automática de resumo com insights.",
                },
                {
                  icon: TrendingUp,
                  title: "Acompanhamento Quantitativo",
                  desc: "Gráficos de humor diário, tendências e comparativo entre pacientes.",
                },
                {
                  icon: Brain,
                  title: "Prontuário Eletrônico",
                  desc: "Histórico de sessões, diagnósticos e tarefas prescritas integradas.",
                },
                {
                  icon: Shield,
                  title: "Conformidade CRP",
                  desc: "Resumo executivo alinhado às exigências de evolução clínica.",
                },
                {
                  icon: ArrowRight,
                  title: "Prescrição Automática",
                  desc: "Sugestão de exercícios e áudios baseada no conteúdo da sessão.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground">
          PsyFlow - Dashboard para Psicologos.
        </div>
      </footer>
    </div>
  );
}
