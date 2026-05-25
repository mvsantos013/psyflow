import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Mic,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { mockPacientes } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { agendaSessaoId, usePagamentos } from "@/lib/pagamento-store";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HORAS = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDiaMes(d: Date) {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

// Sessões mockadas extras posicionadas relativas ao início da semana visualizada
// [diaOffset, hora, pacienteId, tipo]
const SESSOES_MOCK_SEMANA: Array<{
  diaOffset: number;
  hora: number;
  pacienteId: string;
  tipo: "remota" | "presencial";
}> = [
  { diaOffset: 0, hora: 9, pacienteId: "p2", tipo: "remota" },
  { diaOffset: 0, hora: 11, pacienteId: "p3", tipo: "presencial" },
  { diaOffset: 0, hora: 15, pacienteId: "p1", tipo: "remota" },
  { diaOffset: 1, hora: 10, pacienteId: "p4", tipo: "remota" },
  { diaOffset: 1, hora: 14, pacienteId: "p2", tipo: "presencial" },
  { diaOffset: 1, hora: 17, pacienteId: "p3", tipo: "remota" },
  { diaOffset: 2, hora: 9, pacienteId: "p1", tipo: "presencial" },
  { diaOffset: 2, hora: 16, pacienteId: "p4", tipo: "remota" },
  { diaOffset: 3, hora: 10, pacienteId: "p3", tipo: "remota" },
  { diaOffset: 3, hora: 14, pacienteId: "p1", tipo: "remota" },
  { diaOffset: 3, hora: 18, pacienteId: "p2", tipo: "presencial" },
  { diaOffset: 4, hora: 11, pacienteId: "p4", tipo: "presencial" },
  { diaOffset: 4, hora: 15, pacienteId: "p2", tipo: "remota" },
  { diaOffset: 4, hora: 17, pacienteId: "p1", tipo: "remota" },
];

type SessaoAgendada = {
  paciente: (typeof mockPacientes)[number];
  quando: Date;
  tipo: "remota" | "presencial";
};

export function DashboardHome() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const { isPaid } = usePagamentos();
  const pacientesAtivos = mockPacientes.filter((p) => p.status === "ativo");
  const pacientesMap = useMemo(
    () => new Map(mockPacientes.map((p) => [p.id, p])),
    []
  );

  const sessoesSemana: SessaoAgendada[] = useMemo(() => {
    return SESSOES_MOCK_SEMANA.flatMap((s) => {
      const p = pacientesMap.get(s.pacienteId);
      if (!p) return [];
      const d = new Date(weekStart);
      d.setDate(d.getDate() + s.diaOffset);
      d.setHours(s.hora, 0, 0, 0);
      return [{ paciente: p, quando: d, tipo: s.tipo }];
    });
  }, [weekStart, pacientesMap]);

  const proximasSessoes: SessaoAgendada[] = useMemo(() => {
    const agora = new Date();
    const inicioHoje = startOfWeek(agora);
    const lista: SessaoAgendada[] = [];
    // Expande as sessões mockadas por 3 semanas a partir desta para garantir
    // que sempre haja próximas sessões para mostrar.
    for (let w = 0; w < 3; w++) {
      for (const s of SESSOES_MOCK_SEMANA) {
        const p = pacientesMap.get(s.pacienteId);
        if (!p) continue;
        const d = new Date(inicioHoje);
        d.setDate(d.getDate() + w * 7 + s.diaOffset);
        d.setHours(s.hora, 0, 0, 0);
        if (d >= agora) lista.push({ paciente: p, quando: d, tipo: s.tipo });
      }
    }
    return lista
      .sort((a, b) => a.quando.getTime() - b.quando.getTime())
      .slice(0, 6);
  }, [pacientesMap]);

  const sessoesHoje = sessoesSemana.filter(
    (s) => s.quando.toDateString() === new Date().toDateString()
  ).length;

  const stats = [
    {
      label: "Pacientes Ativos",
      value: pacientesAtivos.length.toString(),
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Sessões Hoje",
      value: sessoesHoje.toString(),
      icon: LayoutDashboard,
      color: "bg-chart-2/10 text-chart-2",
    },
    {
      label: "Tarefas Pendentes",
      value: "6",
      icon: TrendingUp,
      color: "bg-chart-5/10 text-chart-5",
    },
    {
      label: "Transcrições IA",
      value: "3",
      icon: Mic,
      color: "bg-chart-3/10 text-chart-3",
    },
  ];

  const atividadeRecente = [
    { texto: "Transcrição IA gerada — Ana Carolina", time: "Hoje, 10:32" },
    { texto: "Diário atualizado — Marina Santos", time: "Hoje, 09:15" },
    { texto: "Sessão finalizada — Ricardo Oliveira", time: "Ontem, 17:45" },
    { texto: "Tarefa concluída — Ana Carolina", time: "Ontem, 14:20" },
    { texto: "Novo paciente cadastrado — Felipe Costa", time: "22 Mai, 11:00" },
  ];

  const diasDaSemana = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const navegarSemana = (delta: number) => {
    const novo = new Date(weekStart);
    novo.setDate(novo.getDate() + delta * 7);
    setWeekStart(novo);
  };

  const fimSemana = new Date(weekStart);
  fimSemana.setDate(fimSemana.getDate() + 6);

  const formatHora = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

  const formatDiaLabel = (d: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    if (dd.getTime() === hoje.getTime()) return "Hoje";
    if (dd.getTime() === amanha.getTime()) return "Amanhã";
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bem-vindo de volta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo da sua clínica hoje.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Próximas Sessões + Calendário */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de Próximas Sessões */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Próximas Sessões
            </h2>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2">
            {proximasSessoes.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem sessões agendadas nesta semana.
              </p>
            )}
            {proximasSessoes.map((s, i) => (
              <Link
                key={i}
                to="/dashboard/pacientes/$id"
                params={{ id: s.paciente.id }}
                className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <img
                  src={s.paciente.foto}
                  alt={s.paciente.nome}
                  className="h-9 w-9 rounded-full bg-muted object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.paciente.nome}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {s.tipo === "remota" ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    {formatDiaLabel(s.quando)} · {formatHora(s.quando)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Calendário Semanal */}
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Agenda da Semana
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDiaMes(weekStart)} — {formatDiaMes(fimSemana)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => navegarSemana(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
              >
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={() => navegarSemana(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
                <div />
                {diasDaSemana.map((d, i) => {
                  const isHoje = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={`text-center py-2 rounded-md text-xs font-medium ${
                        isHoje ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <div>{DIAS_SEMANA[i]}</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border rounded-md overflow-hidden">
                {HORAS.map((hora) => (
                  <div
                    key={hora}
                    className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border"
                  >
                    <div className="bg-card px-1.5 py-2 text-[10px] text-muted-foreground">
                      {hora}
                    </div>
                    {diasDaSemana.map((dia, di) => {
                      const horaNum = parseInt(hora);
                      const sessao = sessoesSemana.find(
                        (s) =>
                          s.quando.toDateString() === dia.toDateString() &&
                          s.quando.getHours() === horaNum
                      );
                      return (
                        <div key={di} className="bg-card min-h-[42px] relative">
                          {sessao && (
                            (() => {
                              const pago = isPaid(
                                agendaSessaoId({
                                  data: sessao.quando,
                                  hora: horaNum,
                                  pacienteId: sessao.paciente.id,
                                })
                              );
                              const styles = pago
                                ? "bg-emerald-500/15 border border-emerald-500/50 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                                : sessao.tipo === "remota"
                                ? "bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary"
                                : "bg-chart-3/10 border border-chart-3/30 hover:bg-chart-3/20 text-chart-3";
                              return (
                                <Link
                                  to="/dashboard/pacientes/$id"
                                  params={{ id: sessao.paciente.id }}
                                  className={`absolute inset-0.5 rounded-md px-1.5 py-1 transition-colors flex flex-col justify-center ${styles}`}
                                  title={pago ? "Sessão paga" : "Sessão não paga"}
                                >
                                  <p className="text-[10px] font-medium leading-tight truncate">
                                    {pago ? "✓ " : ""}
                                    {sessao.paciente.nome.split(" ")[0]}
                                  </p>
                                </Link>
                              );
                            })()
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary/30 border border-primary/40" />
                  Remota
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-chart-3/30 border border-chart-3/40" />
                  Presencial
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
                  Paga
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Atividade Recente */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Atividade Recente</h2>
        <div className="mt-4 space-y-3">
          {atividadeRecente.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.texto}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
