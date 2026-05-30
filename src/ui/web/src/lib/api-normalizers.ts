import type {
  AgendaEntry,
  ExerciseTemplate,
  Patient,
  PatientStatus,
  PatientRecord,
  MoodRecord,
  GeneralSummary,
  Session,
  SessionType,
  PrescribedTask,
  TaskStatus,
  TaskType,
  TranscriptionResult,
} from "@/lib/ui-types";

type ApiPatient = {
  id: string;
  name?: string;
  email?: string;
  birthDate?: string | null;
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
  paid?: boolean;
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
      return "active";
    case "archived":
      return "archived";
    case "discharged":
      return "discharged";
    case "inactive":
    default:
      return "inactive";
  }
}

function normalizeSessionType(type: string | undefined): SessionType {
  switch (type) {
    case "inPerson":
      return "inPerson";
    case "remote":
    default:
      return "remote";
  }
}

function normalizeTaskType(type: string | undefined): TaskType {
  switch (type) {
    case "exercise":
      return "exercise";
    case "journal":
      return "journal";
    case "habit":
      return "habit";
    case "audio":
    default:
      return "audio";
  }
}

function normalizeTaskStatus(status: string | undefined): TaskStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "approved":
      return "approved";
    case "pending":
    default:
      return "pending";
  }
}

function normalizeMoodSource(source: string | undefined): MoodRecord["source"] {
  switch (source) {
    case "patient":
      return "patient";
    case "professional":
    default:
      return "professional";
  }
}

function normalizeGeneralSummary(summary: unknown): GeneralSummary | null {
  if (!summary) return null;
  if (typeof summary === "string") {
    return {
      sintese: summary,
      recurringThemes: [],
      generalProgress: "",
      attentionPoints: [],
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
    recurringThemes: toStringArray(value.temasRecorrentes ?? value.recurringThemes),
    generalProgress: String(value.evolucaoGeral ?? value.generalProgress ?? ""),
    attentionPoints: toStringArray(value.pontosAtencao ?? value.attentionPoints),
  };
}

function calculateAgeFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;

  const [yearText, monthText, dayText] = birthDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  const dayDiff = today.getDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function normalizePatient(patient: ApiPatient): Patient {
  const calculatedAge = calculateAgeFromBirthDate(patient.birthDate);

  return {
    id: patient.id,
    name: patient.name ?? "",
    email: patient.email ?? "",
    age: calculatedAge ?? 0,
    birthDate: patient.birthDate ?? undefined,
    treatmentStartDate: patient.treatmentStartDate ?? "",
    status: normalizePatientStatus(patient.status),
    lastSession: patient.lastSession ?? "",
    nextSession: patient.nextSession ?? "",
    nextSessionHour: patient.nextSessionHour ?? undefined,
    averageMood: Number(patient.averageMood ?? 0),
    journalCount: Number(patient.journalCount ?? 0),
    avatarUrl: patient.avatarUrl ?? undefined,
  };
}

export function normalizeSession(session: ApiSession): Session {
  return {
    id: session.id,
    patientId: session.patientId,
    date: session.date,
    type: normalizeSessionType(session.type),
    duration: Number(session.duration ?? 0),
    paid: Boolean(session.paid),
    summary: session.summary ?? "",
    insights: Array.isArray(session.insights) ? session.insights : [],
    moodStart: Number(session.moodStart ?? 0),
    moodEnd: Number(session.moodEnd ?? 0),
    hasTranscription: Boolean(session.hasTranscription),
    transcription: session.transcription ?? undefined,
    audioS3Key: session.audioS3Key ?? undefined,
    transcriptionS3Key: session.transcriptionS3Key ?? undefined,
  };
}

export function normalizeMoodRecord(record: ApiMoodRecord): MoodRecord {
  return {
    date: record.date,
    value: Number(record.value ?? 0),
    source: normalizeMoodSource(record.source),
  };
}

export function normalizeTask(task: ApiTask): PrescribedTask {
  return {
    id: task.id,
    patientId: task.patientId,
    title: task.title ?? "",
    description: task.description ?? "",
    type: normalizeTaskType(task.type),
    status: normalizeTaskStatus(task.status),
    prescribedAt: task.prescribedAt ?? "",
    completedAt: task.completedAt ?? undefined,
  };
}

export function normalizeExercise(exercise: ApiExercise): ExerciseTemplate {
  return {
    id: exercise.id,
    title: exercise.title ?? "",
    description: exercise.description ?? "",
    type: normalizeTaskType(exercise.type),
  };
}

export function normalizePatientRecord(record: ApiPatientRecord): PatientRecord {
  return {
    patient: normalizePatient(record.patient),
    sessions: (record.sessions ?? []).map(normalizeSession),
    moodRecords: (record.moodRecords ?? []).map(normalizeMoodRecord),
    diagnoses: Array.isArray(record.diagnoses) ? record.diagnoses : [],
    notes: record.notes ?? "",
    generalSummary: normalizeGeneralSummary(record.generalSummary),
  };
}

export function normalizeAgendaEntry(entry: ApiAgendaEntry): AgendaEntry {
  return {
    dayOffset: Number(entry.dayOffset ?? 0),
    hour: Number(entry.hour ?? 0),
    patientId: entry.patientId,
    type: normalizeSessionType(entry.type),
  };
}

export function normalizeTranscription(value: ApiTranscription): TranscriptionResult {
  return {
    summary: value.summary ?? "",
    insights: Array.isArray(value.insights) ? value.insights : [],
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    transcription: value.transcription ?? undefined,
  };
}
