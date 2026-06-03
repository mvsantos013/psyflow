export type PatientStatus = "active" | "inactive" | "archived" | "discharged";
export type SessionType = "inPerson" | "remote";
export type TaskType = "exercise" | "audio" | "journal" | "habit";
export type TaskStatus = "pending" | "completed" | "approved";
export type MoodSource = "patient" | "professional";

export type AIConclusions = {
  tcc?: string;
  psicanalise?: string;
  sistemica?: string;
  humanista?: string;
};

export type GeneralSummary = {
  sintese: string;
  recurringThemes: string[];
  generalProgress: string;
  attentionPoints: string[];
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  age: number;
  birthDate?: string;
  treatmentStartDate: string;
  status: PatientStatus;
  lastSession: string;
  nextSession: string;
  nextSessionHour?: string;
  averageMood: number;
  journalCount: number;
  avatarUrl?: string;
};

export type Session = {
  id: string;
  patientId: string;
  date: string;
  type: SessionType;
  duration: number;
  paid: boolean;
  summary: string;
  insights: string[];
  moodStart: number;
  moodEnd: number;
  hasTranscription: boolean;
  transcription?: string;
  audioS3Key?: string;
  transcriptionS3Key?: string;
  aiConclusions?: AIConclusions;
};

export type MoodRecord = {
  date: string;
  value: number;
  source: MoodSource;
};

export type PatientRecord = {
  patient: Patient;
  sessions: Session[];
  moodRecords: MoodRecord[];
  diagnoses: string[];
  notes: string;
  generalSummary?: GeneralSummary | null;
};

export type PrescribedTask = {
  id: string;
  patientId: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  prescribedAt: string;
  completedAt?: string;
};

export type ExerciseTemplate = {
  id: string;
  title: string;
  description: string;
  type: TaskType;
};

export type TranscriptionResult = {
  summary: string;
  insights: string[];
  tasks: string[];
  transcription?: string;
};
