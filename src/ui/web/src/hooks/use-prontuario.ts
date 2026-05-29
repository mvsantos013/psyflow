import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizePatientRecord, normalizeSession, normalizeTask } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { PatientRecord, PrescribedTask, Session } from "@/lib/ui-types";

type PatientRecordWithSummary = PatientRecord;

async function fetchPatientRecord(id: string): Promise<PatientRecordWithSummary> {
  const res = await apiFetch(`/api/patients/${id}/record`);
  if (!res.ok) throw new Error("Prontuário não encontrado");
  const data = await res.json();
  return normalizePatientRecord(data);
}

async function fetchTasks(id: string): Promise<PrescribedTask[]> {
  const res = await apiFetch(`/api/patients/${id}/tasks`);
  if (!res.ok) throw new Error("Tarefas não encontradas");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}

export function useProntuario(patientId: string) {
  return useQuery({
    queryKey: ["prontuario", patientId],
    queryFn: () => fetchPatientRecord(patientId),
    enabled: !!patientId,
  });
}

export function useTarefas(patientId: string) {
  return useQuery({
    queryKey: ["tarefas", patientId],
    queryFn: () => fetchTasks(patientId),
    enabled: !!patientId,
  });
}

/** Payload sent to POST /api/patients/:id/sessions. */
export type NovaSessaoInput = {
  date: string;
  type: "inPerson" | "remote";
  duration: number;
  moodStart?: number;
  moodEnd?: number;
  summary?: string;
};

/** Payload sent to POST /api/patients/:id/tasks. */
export type NovaTarefaInput = {
  title: string;
  description: string;
  type: PrescribedTask["type"];
};

async function postNovaSessao(patientId: string, input: NovaSessaoInput): Promise<Session> {
  const res = await apiFetch(`/api/patients/${patientId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: input.date,
      type: input.type,
      duration: input.duration,
      moodStart: input.moodStart,
      moodEnd: input.moodEnd,
      summary: input.summary,
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar sessão");
  const data = await res.json();
  return normalizeSession(data);
}

/**
 * Mutation hook for creating a new session.
 * Automatically invalidates the prontuário cache on success
 * so the session list refreshes without a manual reload.
 */
export function useAddSessao(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaSessaoInput) => postNovaSessao(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", patientId] });
    },
  });
}

async function postNovaTarefa(patientId: string, input: NovaTarefaInput): Promise<PrescribedTask> {
  const res = await apiFetch(`/api/patients/${patientId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      type: input.type,
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar tarefa");
  const data = await res.json();
  return normalizeTask(data);
}

export function useAddTarefa(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaTarefaInput) => postNovaTarefa(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", patientId] });
    },
  });
}
