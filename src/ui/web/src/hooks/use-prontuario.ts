import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Prontuario, TarefaPrescrita, Sessao } from "@/lib/mock-data";
import { apiFetch } from "@/lib/api";

type ProntuarioComResumo = Prontuario & {
  resumoGeral: NonNullable<Prontuario["resumoGeral"]> | null;
};

async function fetchProntuario(id: string): Promise<ProntuarioComResumo> {
  const res = await apiFetch(`/api/patients/${id}/record`);
  if (!res.ok) throw new Error("Prontuário não encontrado");
  return res.json();
}

async function fetchTarefas(id: string): Promise<TarefaPrescrita[]> {
  const res = await apiFetch(`/api/patients/${id}/tasks`);
  if (!res.ok) throw new Error("Tarefas não encontradas");
  return res.json();
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
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Erro ao criar sessão");
  return res.json();
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
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Erro ao criar tarefa");
  return res.json();
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
