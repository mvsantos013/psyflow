import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  normalizePatientRecord,
  normalizeSession,
  normalizeTask,
  toApiSessionType,
  toApiTaskType,
} from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { Prontuario, TarefaPrescrita, Sessao } from "@/lib/ui-types";

type ProntuarioComResumo = Prontuario;

async function fetchProntuario(id: string): Promise<ProntuarioComResumo> {
  const res = await apiFetch(`/api/patients/${id}/record`);
  if (!res.ok) throw new Error("Prontuário não encontrado");
  const data = await res.json();
  return normalizePatientRecord(data);
}

async function fetchTarefas(id: string): Promise<TarefaPrescrita[]> {
  const res = await apiFetch(`/api/patients/${id}/tasks`);
  if (!res.ok) throw new Error("Tarefas não encontradas");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}

export function useProntuario(pacienteId: string) {
  return useQuery({
    queryKey: ["prontuario", pacienteId],
    queryFn: () => fetchProntuario(pacienteId),
    enabled: !!pacienteId,
  });
}

export function useTarefas(pacienteId: string) {
  return useQuery({
    queryKey: ["tarefas", pacienteId],
    queryFn: () => fetchTarefas(pacienteId),
    enabled: !!pacienteId,
  });
}

/** Payload sent to POST /api/patients/:id/sessions. */
export type NovaSessaoInput = {
  data: string;
  tipo: "presencial" | "remota";
  duracao: number;
  humorInicio?: number;
  humorFim?: number;
  resumo?: string;
};

/** Payload sent to POST /api/patients/:id/tasks. */
export type NovaTarefaInput = {
  titulo: string;
  descricao: string;
  tipo: TarefaPrescrita["tipo"];
};

async function postNovaSessao(pacienteId: string, input: NovaSessaoInput): Promise<Sessao> {
  const res = await apiFetch(`/api/patients/${pacienteId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: input.data,
      type: toApiSessionType(input.tipo),
      duration: input.duracao,
      moodStart: input.humorInicio,
      moodEnd: input.humorFim,
      summary: input.resumo,
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
export function useAddSessao(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaSessaoInput) => postNovaSessao(pacienteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuario", pacienteId] });
    },
  });
}

async function postNovaTarefa(pacienteId: string, input: NovaTarefaInput): Promise<TarefaPrescrita> {
  const res = await apiFetch(`/api/patients/${pacienteId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.titulo,
      description: input.descricao,
      type: toApiTaskType(input.tipo),
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar tarefa");
  const data = await res.json();
  return normalizeTask(data);
}

export function useAddTarefa(pacienteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaTarefaInput) => postNovaTarefa(pacienteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", pacienteId] });
    },
  });
}
