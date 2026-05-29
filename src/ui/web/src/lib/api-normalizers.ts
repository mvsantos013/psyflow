import type {
  AgendaEntry,
  ExercicioTemplate,
  Paciente,
  PatientStatus,
  Prontuario,
  RegistroHumor,
  ResumoGeral,
  Sessao,
  SessionType,
  TarefaPrescrita,
  TaskStatus,
  TaskType,
  TranscricaoResult,
} from "@/lib/ui-types";

type ApiPatient = {
  id: string;
  name?: string;
  email?: string;
  age?: number;
  treatmentStartDate?: string;
  status?: string;
  lastSession?: string;
  nextSession?: string;
  nextSessionHour?: string | null;
  averageMood?: number;
  journalCount?: number;
  avatarUrl?: string | null;
};

type ApiSession = {
  id: string;
  patientId: string;
  date: string;
  type?: string;
  duration?: number;
  summary?: string;
  insights?: string[];
  moodStart?: number;
  moodEnd?: number;
  hasTranscription?: boolean;
  transcription?: string;
  audioS3Key?: string | null;
  transcriptionS3Key?: string | null;
};

type ApiMoodRecord = {
  date: string;
  value?: number;
  source?: string;
};

type ApiTask = {
  id: string;
  patientId: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  prescribedAt?: string;
  completedAt?: string | null;
};

type ApiExercise = {
  id: string;
  title?: string;
  description?: string;
  type?: string;
};

type ApiPatientRecord = {
  patient: ApiPatient;
  sessions?: ApiSession[];
  moodRecords?: ApiMoodRecord[];
  diagnoses?: string[];
  notes?: string;
  generalSummary?: unknown;
};

type ApiAgendaEntry = {
  dayOffset?: number;
  hour?: number;
  patientId: string;
  type?: string;
};

type ApiTranscription = {
  summary?: string;
  insights?: string[];
  tasks?: string[];
  transcription?: string;
};

function normalizePatientStatus(status: string | undefined): PatientStatus {
  switch (status) {
    case "active":
    case "ativo":
      return "ativo";
    case "discharged":
    case "alta":
      return "alta";
    case "inactive":
    case "archived":
    case "inativo":
    default:
      return "inativo";
  }
}

function normalizeSessionType(type: string | undefined): SessionType {
  switch (type) {
    case "inPerson":
    case "presencial":
      return "presencial";
    case "remote":
    case "remota":
    default:
      return "remota";
  }
}

function normalizeTaskType(type: string | undefined): TaskType {
  switch (type) {
    case "exercise":
    case "exercicio":
      return "exercicio";
    case "journal":
    case "diario":
      return "diario";
    case "habit":
    case "habito":
      return "habito";
    case "audio":
    default:
      return "audio";
  }
}

function normalizeTaskStatus(status: string | undefined): TaskStatus {
  switch (status) {
    case "completed":
    case "concluida":
      return "concluida";
    case "approved":
    case "aprovada":
      return "aprovada";
    case "pending":
    case "pendente":
    default:
      return "pendente";
  }
}

function normalizeMoodSource(source: string | undefined): RegistroHumor["fonte"] {
  switch (source) {
    case "patient":
    case "paciente":
      return "paciente";
    case "professional":
    case "profissional":
    default:
      return "profissional";
  }
}

function normalizeGeneralSummary(summary: unknown): ResumoGeral | null {
  if (!summary) return null;
  if (typeof summary === "string") {
    return {
      sintese: summary,
      temasRecorrentes: [],
      evolucaoGeral: "",
      pontosAtencao: [],
    };
  }

  if (typeof summary !== "object" || Array.isArray(summary)) {
    return null;
  }

  const value = summary as Record<string, unknown>;
  const toStringArray = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];

  return {
    sintese: String(value.sintese ?? value.summary ?? ""),
    temasRecorrentes: toStringArray(value.temasRecorrentes ?? value.recurringThemes),
    evolucaoGeral: String(value.evolucaoGeral ?? value.generalProgress ?? ""),
    pontosAtencao: toStringArray(value.pontosAtencao ?? value.attentionPoints),
  };
}

export function normalizePatient(patient: ApiPatient): Paciente {
  return {
    id: patient.id,
    nome: patient.name ?? "",
    email: patient.email ?? "",
    idade: Number(patient.age ?? 0),
    inicioTratamento: patient.treatmentStartDate ?? "",
    status: normalizePatientStatus(patient.status),
    ultimaSessao: patient.lastSession ?? "",
    proximaSessao: patient.nextSession ?? "",
    proximaSessaoHora: patient.nextSessionHour ?? undefined,
    humorMedio: Number(patient.averageMood ?? 0),
    diarioCount: Number(patient.journalCount ?? 0),
    foto: patient.avatarUrl ?? undefined,
  };
}

export function normalizeSession(session: ApiSession): Sessao {
  return {
    id: session.id,
    pacienteId: session.patientId,
    data: session.date,
    tipo: normalizeSessionType(session.type),
    duracao: Number(session.duration ?? 0),
    resumo: session.summary ?? "",
    insights: Array.isArray(session.insights) ? session.insights : [],
    humorInicio: Number(session.moodStart ?? 0),
    humorFim: Number(session.moodEnd ?? 0),
    temTranscricao: Boolean(session.hasTranscription),
    transcricao: session.transcription ?? undefined,
    audioS3Key: session.audioS3Key ?? undefined,
    transcriptionS3Key: session.transcriptionS3Key ?? undefined,
  };
}

export function normalizeMoodRecord(record: ApiMoodRecord): RegistroHumor {
  return {
    data: record.date,
    valor: Number(record.value ?? 0),
    fonte: normalizeMoodSource(record.source),
  };
}

export function normalizeTask(task: ApiTask): TarefaPrescrita {
  return {
    id: task.id,
    pacienteId: task.patientId,
    titulo: task.title ?? "",
    descricao: task.description ?? "",
    tipo: normalizeTaskType(task.type),
    status: normalizeTaskStatus(task.status),
    dataPrescricao: task.prescribedAt ?? "",
    dataConclusao: task.completedAt ?? undefined,
  };
}

export function normalizeExercise(exercise: ApiExercise): ExercicioTemplate {
  return {
    id: exercise.id,
    titulo: exercise.title ?? "",
    descricao: exercise.description ?? "",
    tipo: normalizeTaskType(exercise.type),
  };
}

export function normalizePatientRecord(record: ApiPatientRecord): Prontuario {
  return {
    paciente: normalizePatient(record.patient),
    sessoes: (record.sessions ?? []).map(normalizeSession),
    registrosHumor: (record.moodRecords ?? []).map(normalizeMoodRecord),
    diagnosticos: Array.isArray(record.diagnoses) ? record.diagnoses : [],
    observacoes: record.notes ?? "",
    resumoGeral: normalizeGeneralSummary(record.generalSummary),
  };
}

export function normalizeAgendaEntry(entry: ApiAgendaEntry): AgendaEntry {
  return {
    diaOffset: Number(entry.dayOffset ?? 0),
    hora: Number(entry.hour ?? 0),
    pacienteId: entry.patientId,
    tipo: normalizeSessionType(entry.type),
  };
}

export function normalizeTranscription(value: ApiTranscription): TranscricaoResult {
  return {
    resumo: value.summary ?? "",
    insights: Array.isArray(value.insights) ? value.insights : [],
    tarefas: Array.isArray(value.tasks) ? value.tasks : [],
    transcricao: value.transcription ?? undefined,
  };
}

export function toApiSessionType(type: SessionType): "inPerson" | "remote" {
  return type === "presencial" ? "inPerson" : "remote";
}

export function toApiTaskType(type: TaskType): "exercise" | "audio" | "journal" | "habit" {
  switch (type) {
    case "exercicio":
      return "exercise";
    case "diario":
      return "journal";
    case "habito":
      return "habit";
    case "audio":
    default:
      return "audio";
  }
}