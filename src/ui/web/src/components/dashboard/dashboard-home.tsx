import {
  CalendarDays,
  Loader2,
  LayoutDashboard,
  Users,
  TrendingUp,
  Video,
  MapPin,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardAgendaGrid } from "@/components/agenda/dashboard-agenda-grid";
import { useAgendaEventsRange } from "@/hooks/agenda/use-agenda-events";
import { usePacientes } from "@/hooks/use-pacientes";
import { formatHora, formatDiaLabel, startOfWeek } from "@/lib/utils";

type SessaoAgendada = {
  patient?: { id: string; name: string; avatarUrl?: string };
  title: string;
  quando: Date;
  tipo: "remote" | "inPerson";
};

export function DashboardHome() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const pacientesQuery = usePacientes();
  const pacientes = useMemo(() => pacientesQuery.data ?? [], [pacientesQuery.data]);
  const pacientesAtivos = pacientes.filter((p) => p.status === "active");
  const pacientesMap = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  const referenceNow = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => {
    const d = new Date(referenceNow);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [referenceNow]);
  const currentWeekStart = useMemo(() => startOfWeek(referenceNow), [referenceNow]);
  const currentWeekEnd = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [currentWeekStart]);
  const currentMonthStart = useMemo(
    () => new Date(referenceNow.getFullYear(), referenceNow.getMonth(), 1),
    [referenceNow],
  );
  const statsRangeStart = useMemo(
    () =>
      currentWeekStart < currentMonthStart
        ? new Date(currentWeekStart)
        : new Date(currentMonthStart),
    [currentMonthStart, currentWeekStart],
  );
  const currentMonthEnd = useMemo(
    () => new Date(referenceNow.getFullYear(), referenceNow.getMonth() + 1, 1),
    [referenceNow],
  );

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const agendaRangeEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 62);
    return d;
  }, [weekStart]);

  const agendaRangeQuery = useAgendaEventsRange({
    from: weekStart.toISOString(),
    to: agendaRangeEnd.toISOString(),
    includeCancelled: false,
  });
  const agendaEvents = useMemo(() => agendaRangeQuery.data ?? [], [agendaRangeQuery.data]);

  const presentRangeEnd = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 180);
    return d;
  }, [todayStart]);

  const presentAgendaRangeQuery = useAgendaEventsRange({
    from: statsRangeStart.toISOString(),
    to: presentRangeEnd.toISOString(),
    includeCancelled: false,
  });
  const presentAgendaEvents = useMemo(
    () => presentAgendaRangeQuery.data ?? [],
    [presentAgendaRangeQuery.data],
  );

  const statsLoading = pacientesQuery.isPending || presentAgendaRangeQuery.isPending;
  const upcomingLoading = presentAgendaRangeQuery.isPending;
  const calendarLoading = agendaRangeQuery.isPending || agendaRangeQuery.isFetching;

  const [showStatsSkeleton, setShowStatsSkeleton] = useState(true);
  const [statsContentVisible, setStatsContentVisible] = useState(false);
  const [showUpcomingSkeleton, setShowUpcomingSkeleton] = useState(true);
  const [upcomingContentVisible, setUpcomingContentVisible] = useState(false);

  const isInitialLoading =
    pacientesQuery.isPending || agendaRangeQuery.isPending || presentAgendaRangeQuery.isPending;
  const isRefreshing =
    !isInitialLoading &&
    (pacientesQuery.isFetching ||
      agendaRangeQuery.isFetching ||
      presentAgendaRangeQuery.isFetching);

  const presentSessions: SessaoAgendada[] = useMemo(() => {
    return presentAgendaEvents
      .map((event) => {
        const p = event.patientId ? pacientesMap.get(event.patientId) : undefined;
        return {
          patient: p,
          title: event.title,
          quando: new Date(event.startAt),
          tipo: event.locationType,
        };
      })
      .sort((a, b) => a.quando.getTime() - b.quando.getTime());
  }, [pacientesMap, presentAgendaEvents]);

  const sessoesSemana: SessaoAgendada[] = useMemo(() => {
    return agendaEvents
      .filter((event) => {
        const start = new Date(event.startAt);
        return start >= weekStart && start < weekEnd;
      })
      .map((event) => {
        const p = event.patientId ? pacientesMap.get(event.patientId) : undefined;
        return {
          patient: p,
          title: event.title,
          quando: new Date(event.startAt),
          tipo: event.locationType,
        };
      });
  }, [agendaEvents, pacientesMap, weekEnd, weekStart]);

  const proximasSessoes: SessaoAgendada[] = useMemo(
    () => presentSessions.filter((s) => s.quando >= referenceNow).slice(0, 15),
    [presentSessions, referenceNow],
  );

  const sessoesHoje = useMemo(
    () =>
      presentSessions.filter((s) => {
        const start = s.quando;
        return (
          start.getFullYear() === referenceNow.getFullYear() &&
          start.getMonth() === referenceNow.getMonth() &&
          start.getDate() === referenceNow.getDate()
        );
      }).length,
    [presentSessions, referenceNow],
  );

  const sessoesSemanaAtual = useMemo(
    () =>
      presentSessions.filter((s) => {
        const start = s.quando;
        return start >= currentWeekStart && start < currentWeekEnd;
      }).length,
    [currentWeekEnd, currentWeekStart, presentSessions],
  );

  const sessoesMesAtual = useMemo(
    () =>
      presentSessions.filter((s) => {
        const start = s.quando;
        return start >= currentMonthStart && start < currentMonthEnd;
      }).length,
    [currentMonthEnd, currentMonthStart, presentSessions],
  );

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
      label: "Sessões na Semana",
      value: sessoesSemanaAtual.toString(),
      icon: TrendingUp,
      color: "bg-chart-5/10 text-chart-5",
    },
    {
      label: "Sessões no mês",
      value: sessoesMesAtual.toString(),
      icon: CalendarDays,
      color: "bg-chart-3/10 text-chart-3",
    },
  ];

  useEffect(() => {
    if (statsLoading) {
      setShowStatsSkeleton(true);
      setStatsContentVisible(false);
      return;
    }

    setShowStatsSkeleton(true);

    const revealTimer = window.setTimeout(() => {
      setStatsContentVisible(true);
    }, 60);

    const hideSkeletonTimer = window.setTimeout(() => {
      setShowStatsSkeleton(false);
    }, 200);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideSkeletonTimer);
    };
  }, [statsLoading]);

  useEffect(() => {
    if (upcomingLoading) {
      setShowUpcomingSkeleton(true);
      setUpcomingContentVisible(false);
      return;
    }

    setShowUpcomingSkeleton(true);

    const revealTimer = window.setTimeout(() => {
      setUpcomingContentVisible(true);
    }, 60);

    const hideSkeletonTimer = window.setTimeout(() => {
      setShowUpcomingSkeleton(false);
    }, 200);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideSkeletonTimer);
    };
  }, [upcomingLoading]);

  return (
    <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta
          </h1>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Atualizando dados
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo da sua clínica hoje.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="relative mt-1 h-9 w-18">
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      showStatsSkeleton ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <div className="h-8 w-14 animate-pulse rounded-md bg-primary/10" />
                  </div>
                  <p
                    className={`absolute inset-0 text-3xl font-semibold text-foreground transition-opacity duration-300 ${
                      statsContentVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {stat.value}
                  </p>
                </div>
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
            <h2 className="text-base font-semibold text-foreground">Próximas Sessões</h2>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 relative">
            <div
              className={`absolute inset-0 z-10 space-y-2 transition-opacity duration-300 ${
                showUpcomingSkeleton ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-primary/10" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="h-3.5 w-30 animate-pulse rounded bg-primary/10" />
                      <div className="h-3 w-36 max-w-full animate-pulse rounded bg-primary/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`relative z-0 space-y-2 transition-opacity duration-300 ${
                upcomingContentVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {proximasSessoes.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sem próximas sessões agendadas.
                </p>
              )}

              {proximasSessoes.map((s, i) => (
                <div key={i}>
                  {s.patient ? (
                    <Link
                      to="/pacientes/$id"
                      params={{ id: s.patient.id }}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <img
                        src={s.patient.avatarUrl || "/images/user-empty.jpg"}
                        alt={s.patient.name}
                        className="h-9 w-9 rounded-full bg-muted object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {s.patient.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {s.tipo === "remote" ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {formatDiaLabel(s.quando)} · {formatHora(s.quando)}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        {s.tipo === "remote" ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDiaLabel(s.quando)} · {formatHora(s.quando)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DashboardAgendaGrid
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          pacientesMap={pacientesMap}
          agendaEvents={agendaEvents}
          isLoading={calendarLoading}
        />
      </div>

      {/* Atividade Recente */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Atividade Recente</h2>
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          A timeline de atividade ainda não foi conectada ao backend.
        </div>
      </div>
    </div>
  );
}
