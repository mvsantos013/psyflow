import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Stethoscope,
  Calendar,
  Clock,
  Brain,
  ListChecks,
  Activity,
  FileText,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Send,
  Check,
  CheckCheck,
  Phone,
  Plus,
  Mic,
  Video as VideoIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  useDeleteSession,
  useProntuario,
  useTarefas,
  useUpdateSessionPaid,
} from "@/hooks/use-prontuario";
import { NewSessionSheet } from "@/components/dashboard/new-session-sheet";
import { NewTaskSheet } from "@/components/dashboard/new-task-sheet";
import { SessionTranscriptionCard } from "@/components/dashboard/session-transcription-card";
import { formatData, formatDataCurta } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  AIConclusions,
  PatientRecord as UiPatientRecord,
  Session as UiSession,
} from "@/lib/ui-types";

type Approach = "cbt" | "psychoanalysis" | "systemic" | "humanistic";

const APPROACH_OPTIONS: { value: Approach; label: string }[] = [
  { value: "cbt", label: "Terapia Cognitivo-Comportamental" },
  { value: "psychoanalysis", label: "Psicanálise" },
  { value: "systemic", label: "Sistêmica" },
  { value: "humanistic", label: "Humanista" },
];

const APPROACH_TO_AI_KEY: Record<Approach, keyof AIConclusions> = {
  cbt: "tcc",
  psychoanalysis: "psicanalise",
  systemic: "sistemica",
  humanistic: "humanista",
};

const EMPTY_GENERAL_SUMMARY: NonNullable<UiPatientRecord["generalSummary"]> = {
  sintese: "",
  recurringThemes: [],
  generalProgress: "",
  attentionPoints: [],
};

export function PatientRecordView({ patientId }: { patientId: string }) {
  const { data: patientRecord, isLoading } = useProntuario(patientId);
  const { data: tasks = [] } = useTarefas(patientId);
  const updateSessionPaidMutation = useUpdateSessionPaid(patientId);
  const deleteSessionMutation = useDeleteSession(patientId);
  const generalSummary = patientRecord?.generalSummary ?? null;
  const [approach, setApproach] = useState<Approach>("cbt");
  const [activeTab, setActiveTab] = useState<"professional" | "assistant">("professional");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [payingSessionId, setPayingSessionId] = useState<string | null>(null);

  const sortedSessions = useMemo(
    () =>
      [...(patientRecord?.sessions || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [patientRecord],
  );

  const moodRecords = patientRecord?.moodRecords ?? [];

  // Merge two humor series on a unified sorted date axis
  const moodChartData = useMemo(() => {
    const allDates = [...new Set(moodRecords.map((r) => r.date))].sort();
    return allDates.map((d) => {
      const p = moodRecords.find((r) => r.date === d && r.source === "patient");
      const prof = moodRecords.find((r) => r.date === d && r.source === "professional");
      return {
        data: formatDataCurta(d),
        patient: p?.value ?? null,
        professional: prof?.value ?? null,
      };
    });
  }, [moodRecords]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando prontuário...</p>
      </div>
    );
  }

  if (!patientRecord) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
      </div>
    );
  }

  const { patient, sessions, diagnoses } = patientRecord;
  const selectedSession =
    sortedSessions.find((s) => s.id === selectedSessionId) || sortedSessions[0];
  const isSelectedSessionPaid = selectedSession ? selectedSession.paid : false;
  const isUpdatingSelectedPaid = selectedSession ? payingSessionId === selectedSession.id : false;

  const handlePaidChange = async (sessionId: string, nextPaid: boolean) => {
    setPayingSessionId(sessionId);
    try {
      await updateSessionPaidMutation.mutateAsync({ sessionId, paid: nextPaid });
    } finally {
      setPayingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta sessão?");
    if (!confirmed) return;
    await deleteSessionMutation.mutateAsync({ sessionId });
    setSelectedSessionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard/pacientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      {/* Header patient */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={patient.avatarUrl || "/images/user-empty.jpg"}
          alt={patient.name}
          className="h-16 w-16 rounded-full bg-muted object-cover"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">
            {patient.age} anos · {patient.email} · Tratamento desde{" "}
            {formatData(patient.treatmentStartDate)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {diagnoses.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                <Stethoscope className="h-3 w-3" />
                {d}
              </span>
            ))}
          </div>
        </div>
        <span className="self-start sm:self-center">
          <StatusBadge status={patient.status} />
        </span>
      </div>

      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="resumo">Visão Geral</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
        </TabsList>

        {/* ========= VISÃO GERAL ========= */}
        <TabsContent value="resumo" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <ClinicalSynthesis
              patientId={patientId}
              generalSummary={generalSummary ?? EMPTY_GENERAL_SUMMARY}
            />
          </div>

          {moodChartData.length > 0 && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Evolução do Humor
              </h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-border)"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-border)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.5rem",
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [
                        value !== null && value !== undefined ? `${value}/10` : "—",
                        name === "patient" ? "Paciente" : "Profissional",
                      ]}
                    />
                    <Legend
                      formatter={(value) => (value === "patient" ? "Paciente" : "Profissional")}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="patient"
                      name="patient"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-primary)" }}
                      activeDot={{ r: 5 }}
                      connectNulls={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="professional"
                      name="professional"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r: 4, fill: "var(--color-chart-2)" }}
                      activeDot={{ r: 5 }}
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ========= SESSÕES (lista + detalhes) ========= */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Histórico de Sessões ({sessions.length})
              </h2>
            </div>
            {sortedSessions.length > 0 && (
              <Button size="sm" onClick={() => setIsSessionSheetOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova Sessão
              </Button>
            )}
          </div>

          {sortedSessions.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                Nenhuma sessão registrada ainda. Registre a primeira sessão para começar.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={() => setIsSessionSheetOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Nova Sessão
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              {/* Lista de sessões */}
              <div className="space-y-2 lg:max-h-[680px] lg:overflow-y-auto lg:pr-1">
                {sortedSessions.map((s) => {
                  const isActive = selectedSession?.id === s.id;
                  const isSessionPaid = s.paid;
                  const isUpdatingPaid = payingSessionId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isActive
                          ? "border-primary/50 bg-primary/5"
                          : "hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatDataCurta(s.date)}
                        </span>
                        {isUpdatingPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Salvando
                          </span>
                        ) : isSessionPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Não pago
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${
                            s.type === "remote"
                              ? "bg-chart-3/10 text-chart-3"
                              : "bg-chart-1/10 text-chart-1"
                          }`}
                        >
                          {s.type === "remote" ? "Remota" : "Presencial"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {s.duration}min
                        </span>
                        {s.hasTranscription && (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3" />
                            IA
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalhe da sessão selecionada */}
              {selectedSession && (
                <div className="space-y-4 min-w-0">
                  {/* Cabeçalho + pagamento */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">
                          {formatData(selectedSession.date)}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{selectedSession.type === "remote" ? "Remota" : "Presencial"}</span>
                          <span>·</span>
                          <span>{selectedSession.duration} min</span>
                          <span>·</span>
                          <span>
                            Humor {selectedSession.moodStart} → {selectedSession.moodEnd}
                            {selectedSession.moodEnd > selectedSession.moodStart && (
                              <span className="text-chart-2 font-medium ml-1">
                                (+{selectedSession.moodEnd - selectedSession.moodStart})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            isSelectedSessionPaid
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={isSelectedSessionPaid}
                            disabled={isUpdatingSelectedPaid}
                            onCheckedChange={(checked) =>
                              handlePaidChange(selectedSession.id, checked === true)
                            }
                          />
                          <span
                            className={`text-sm font-medium ${
                              isSelectedSessionPaid
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {isUpdatingSelectedPaid
                              ? "Salvando..."
                              : isSelectedSessionPaid
                                ? "Sessão paga"
                                : "Marcar como paga"}
                          </span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Excluir sessão"
                          title="Excluir sessão"
                          disabled={deleteSessionMutation.isPending}
                          onClick={() => handleDeleteSession(selectedSession.id)}
                        >
                          {deleteSessionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Switch compartilhado Profissional / Assistente de IA */}
                  <div className="flex items-center justify-between">
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as "professional" | "assistant")}
                    >
                      <TabsList>
                        <TabsTrigger value="professional">Profissional</TabsTrigger>
                        <TabsTrigger value="assistant">Assistente de IA</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Resumo da sessão */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resumo da Sessão
                    </h3>
                    <ProfessionalAssistantText
                      storageKey={`session-summary-prof-${selectedSession.id}`}
                      professionalContent={selectedSession.summary}
                      aiContent={selectedSession.hasTranscription ? selectedSession.summary : ""}
                      placeholder="Escreva seu próprio resumo da sessão..."
                      emptyLabel="Nenhum resumo registrado por você ainda."
                      activeTab={activeTab}
                    />
                  </div>

                  {/* Conclusões IA */}
                  {selectedSession.aiConclusions ? (
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        Conclusões da Sessão
                      </h3>
                      <ProfessionalAssistantConclusions
                        storageKey={`session-conclusion-prof-${selectedSession.id}`}
                        aiConclusions={selectedSession.aiConclusions}
                        insights={selectedSession.insights}
                        approach={approach}
                        setApproach={setApproach}
                        activeTab={activeTab}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-card p-5 shadow-sm text-sm text-muted-foreground">
                      Esta sessão não possui transcrição processada por IA.
                    </div>
                  )}

                  {/* Transcrição da Sessão */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />
                      Transcrição da Sessão
                    </h3>
                    <div className="mt-3">
                      <SessionTranscriptionCard
                        sessaoId={selectedSession.id}
                        pacienteId={patientId}
                        temTranscricao={selectedSession.hasTranscription}
                        transcricaoInicial={selectedSession.transcription}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* placeholder antigo removido */}
        {false && (
          <>
            <div />
          </>
        )}

        {/* ========= TAREFAS ========= */}
        <TabsContent value="tarefas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Tarefas Prescritas ({tasks.length})
              </h2>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsTaskSheetOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Prescrever tarefa
            </Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa prescrita.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      t.status === "completed"
                        ? "bg-chart-2"
                        : t.status === "approved"
                          ? "bg-primary"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {t.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDataCurta(t.prescribedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewSessionSheet
        pacienteId={patientId}
        open={isSessionSheetOpen}
        onOpenChange={setIsSessionSheetOpen}
        onSessaoCriada={(id) => setSelectedSessionId(id)}
      />
      <NewTaskSheet
        pacienteId={patientId}
        open={isTaskSheetOpen}
        onOpenChange={setIsTaskSheetOpen}
      />
    </div>
  );
}

type ChatMsg = {
  id: string;
  from: "psi" | "patient";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
};

function WhatsAppChat({ patient }: { patient: { name: string; avatarUrl?: string } }) {
  const [mensagens, setMensagens] = useState<ChatMsg[]>([
    {
      id: "m1",
      from: "psi",
      text: "Oi! Tudo bem? Confirmando nossa sessão de quarta às 14h. 🙂",
      time: "09:12",
      status: "read",
    },
    {
      id: "m2",
      from: "patient",
      text: "Oi, tudo sim! Confirmado. Posso usar o link de sempre?",
      time: "09:18",
    },
    {
      id: "m3",
      from: "psi",
      text: "Pode sim, o mesmo link. Lembra de tentar fazer o registro de pensamentos antes da gente conversar?",
      time: "09:20",
      status: "read",
    },
    {
      id: "m4",
      from: "patient",
      text: "Combinado, vou anotar essa semana. Obrigado!",
      time: "09:22",
    },
  ]);
  const [texto, setTexto] = useState("");

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    const agora = new Date();
    setMensagens((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        from: "psi",
        text: t,
        time: `${agora.getHours().toString().padStart(2, "0")}:${agora
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        status: "sent",
      },
    ]);
    setTexto("");
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[calc(100vh-22rem)] min-h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <img
          src={patient.avatarUrl || "/images/user-empty.jpg"}
          alt={patient.name}
          className="h-10 w-10 rounded-full bg-muted object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{patient.name}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            WhatsApp · online
          </p>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <VideoIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      >
        {mensagens.map((m) => {
          const mine = m.from === "psi";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine
                    ? "bg-emerald-500/15 text-foreground rounded-br-sm"
                    : "bg-card border text-foreground rounded-bl-sm"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  <span>{m.time}</span>
                  {mine && m.status === "read" && (
                    <CheckCheck className="h-3 w-3 text-emerald-600" />
                  )}
                  {mine && m.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                  {mine && m.status === "sent" && <Check className="h-3 w-3" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={enviar} className="border-t bg-muted/30 px-3 py-2 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-card"
        />
        <Button type="submit" size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

// ============= Síntese Clínica (Profissional / Assistente) =============

type EditableSynthesis = {
  sintese: string;
  temas: string;
  evolucao: string;
  pontos: string;
};

type ResumoGeral = NonNullable<UiPatientRecord["generalSummary"]>;

function ClinicalSynthesis({
  patientId,
  generalSummary,
}: {
  patientId: string;
  generalSummary: ResumoGeral;
}) {
  const storageKey = `clinical-synthesis-prof-${patientId}`;
  const [editando, setEditando] = useState(false);
  const [dados, setDados] = useState<EditableSynthesis>({
    sintese: "",
    temas: "",
    evolucao: "",
    pontos: "",
  });

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDados(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const salvar = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dados));
    } catch {
      // ignore
    }
    setEditando(false);
  };

  const temasList = dados.temas
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const pontosList = dados.pontos
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  const temPreenchido =
    dados.sintese || temasList.length > 0 || dados.evolucao || pontosList.length > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Síntese Clínica do Caso</h2>
      </div>

      <Tabs defaultValue="professional" className="mt-4">
        <TabsList>
          <TabsTrigger value="professional">Profissional</TabsTrigger>
          <TabsTrigger value="assistant">Assistente de IA</TabsTrigger>
        </TabsList>

        {/* ----- PROFISSIONAL (editável) ----- */}
        <TabsContent value="professional" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Seu conteúdo
            </span>
            {editando ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={salvar}>
                  Salvar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                {temPreenchido ? "Editar" : "Preencher"}
              </Button>
            )}
          </div>

          {editando ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Síntese
                </label>
                <Textarea
                  value={dados.sintese}
                  onChange={(e) => setDados({ ...dados, sintese: e.target.value })}
                  rows={4}
                  className="mt-1.5"
                  placeholder="Descreva sua síntese clínica do caso..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Temas Recorrentes (um por linha)
                  </label>
                  <Textarea
                    value={dados.temas}
                    onChange={(e) => setDados({ ...dados, temas: e.target.value })}
                    rows={4}
                    className="mt-1.5"
                    placeholder={"Tema 1\nTema 2"}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pontos de Atenção (um por linha)
                  </label>
                  <Textarea
                    value={dados.pontos}
                    onChange={(e) => setDados({ ...dados, pontos: e.target.value })}
                    rows={4}
                    className="mt-1.5"
                    placeholder={"Ponto 1\nPonto 2"}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Evolução Geral
                </label>
                <Textarea
                  value={dados.evolucao}
                  onChange={(e) => setDados({ ...dados, evolucao: e.target.value })}
                  rows={3}
                  className="mt-1.5"
                  placeholder="Como o patient vem evoluindo..."
                />
              </div>
            </div>
          ) : !temPreenchido ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma síntese registrada por você ainda.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique em "Preencher" para escrever sua própria síntese clínica.
              </p>
            </div>
          ) : (
            <SinteseView
              sintese={dados.sintese}
              temas={temasList}
              evolucao={dados.evolucao}
              pontos={pontosList}
            />
          )}
        </TabsContent>

        {/* ----- ASSISTENTE (IA) ----- */}
        <TabsContent value="assistant" className="space-y-4 mt-4">
          <span className="inline-block text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Gerado por IA
          </span>
          <SinteseView
            sintese={generalSummary.sintese}
            temas={generalSummary.recurringThemes}
            evolucao={generalSummary.generalProgress}
            pontos={generalSummary.attentionPoints}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function SinteseView({
  sintese,
  temas,
  evolucao,
  pontos,
}: {
  sintese: string;
  temas: string[];
  evolucao: string;
  pontos: string[];
}) {
  return (
    <div>
      {sintese && <p className="text-sm text-foreground leading-relaxed">{sintese}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Temas Recorrentes
          </h3>
          <ul className="mt-2 space-y-1.5">
            {temas.length === 0 ? (
              <li className="text-sm text-muted-foreground italic">—</li>
            ) : (
              temas.map((t) => (
                <li key={t} className="text-sm text-foreground flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {t}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Pontos de Atenção
          </h3>
          <ul className="mt-2 space-y-1.5">
            {pontos.length === 0 ? (
              <li className="text-sm text-muted-foreground italic">—</li>
            ) : (
              pontos.map((t) => (
                <li key={t} className="text-sm text-foreground flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-chart-5 shrink-0" />
                  {t}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {evolucao && (
        <div className="mt-5 rounded-lg bg-muted/50 p-3 border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Evolução Geral
          </h3>
          <p className="mt-1.5 text-sm text-foreground">{evolucao}</p>
        </div>
      )}
    </div>
  );
}

// ============= Resumo / Conclusão por sessão (Prof / IA) =============

function useLocalString(key: string) {
  const [value, setValue] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(raw);
      else setValue("");
    } catch {
      // ignore
    }
  }, [key]);
  const save = (v: string) => {
    try {
      localStorage.setItem(key, v);
    } catch {
      // ignore
    }
    setValue(v);
  };
  return [value, save] as const;
}

function ProfessionalAssistantText({
  storageKey,
  professionalContent,
  aiContent,
  placeholder,
  emptyLabel,
  activeTab,
}: {
  storageKey: string;
  professionalContent?: string;
  aiContent: string;
  placeholder: string;
  emptyLabel: string;
  activeTab: "professional" | "assistant";
}) {
  const [valor, setValor] = useLocalString(storageKey);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const effectiveProfessionalContent = valor || professionalContent || "";

  const iniciarEdicao = () => {
    setRascunho(effectiveProfessionalContent);
    setEditando(true);
  };
  const salvar = () => {
    setValor(rascunho);
    setEditando(false);
  };

  return (
    <Tabs value={activeTab} className="mt-3">
      <TabsContent value="professional" className="space-y-3 mt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Seu conteúdo
          </span>
          {editando ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvar}>
                Salvar
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={iniciarEdicao}>
              {effectiveProfessionalContent ? "Editar" : "Preencher"}
            </Button>
          )}
        </div>
        {editando ? (
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={6}
            placeholder={placeholder}
          />
        ) : effectiveProfessionalContent ? (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {effectiveProfessionalContent}
          </p>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="assistant" className="space-y-3 mt-3">
        <span className="inline-block text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Gerado por IA
        </span>
        {aiContent ? (
          <p className="text-sm text-foreground leading-relaxed">{aiContent}</p>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum conteúdo gerado por IA para esta sessão ainda.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function ProfessionalAssistantConclusions({
  storageKey,
  aiConclusions,
  insights,
  approach,
  setApproach,
  activeTab,
}: {
  storageKey: string;
  aiConclusions: UiSession["aiConclusions"];
  insights: string[];
  approach: Approach;
  setApproach: (a: Approach) => void;
  activeTab: "professional" | "assistant";
}) {
  type ResumoGeral = NonNullable<UiPatientRecord["generalSummary"]>;
  const [valor, setValor] = useLocalString(storageKey);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");

  const [valorInsights, setValorInsights] = useLocalString(`${storageKey}-insights`);
  const [editandoInsights, setEditandoInsights] = useState(false);
  const [rascunhoInsights, setRascunhoInsights] = useState("");

  const iniciarEdicao = () => {
    setRascunho(valor);
    setEditando(true);
  };
  const salvar = () => {
    setValor(rascunho);
    setEditando(false);
  };

  return (
    <Tabs value={activeTab} className="mt-3">
      <TabsContent value="professional" className="space-y-4 mt-3">
        {/* Conclusões do profissional */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Suas conclusões
            </span>
            {editando ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={salvar}>
                  Salvar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={iniciarEdicao}>
                {valor ? "Editar" : "Preencher"}
              </Button>
            )}
          </div>
          {editando ? (
            <Textarea
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              rows={5}
              placeholder="Escreva suas conclusões clínicas sobre a sessão..."
            />
          ) : valor ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{valor}</p>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma conclusão registrada por você ainda.
              </p>
            </div>
          )}
        </div>

        {/* Insights do profissional */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Seus insights
            </span>
            {editandoInsights ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditandoInsights(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setValorInsights(rascunhoInsights);
                    setEditandoInsights(false);
                  }}
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRascunhoInsights(valorInsights);
                  setEditandoInsights(true);
                }}
              >
                {valorInsights ? "Editar" : "Preencher"}
              </Button>
            )}
          </div>
          {editandoInsights ? (
            <Textarea
              value={rascunhoInsights}
              onChange={(e) => setRascunhoInsights(e.target.value)}
              rows={3}
              placeholder="Anote os insights que observou nesta sessão..."
            />
          ) : valorInsights ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {valorInsights}
            </p>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum insight registrado por você ainda.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="assistant" className="space-y-4 mt-3">
        {/* Conclusões IA por abordagem */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-block text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded self-start">
              Gerado por IA · por abordagem
            </span>
            <Select value={approach} onValueChange={(v) => setApproach(v as Approach)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROACH_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              {aiConclusions?.[APPROACH_TO_AI_KEY[approach]]}
            </p>
          </div>
        </div>

        {/* Insights extraídos por IA */}
        {insights.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Insights extraídos
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {insights.map((i, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                >
                  <Brain className="h-3 w-3" />
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
