import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type AgendaEntry = {
  diaOffset: number;
  hora: number;
  pacienteId: string;
  tipo: "remota" | "presencial";
};

type TranscricaoResult = {
  resumo: string;
  insights: string[];
  tarefas: string[];
};

async function fetchAgendaSessoes(): Promise<AgendaEntry[]> {
  const res = await apiFetch("/api/sessions/agenda");
  if (!res.ok) throw new Error("Falha ao buscar agenda");
  return res.json();
}

async function fetchTranscricao(pacienteId: string): Promise<TranscricaoResult> {
  const res = await apiFetch(`/api/patients/${pacienteId}/transcription`);
  if (!res.ok) throw new Error("Transcrição não encontrada");
  return res.json();
}

export function useAgendaSessoes() {
  return useQuery({
    queryKey: ["agenda", "sessoes"],
    queryFn: fetchAgendaSessoes,
  });
}

export function useTranscricao(pacienteId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["transcricao", pacienteId],
    queryFn: () => fetchTranscricao(pacienteId),
    enabled: !!pacienteId && enabled,
  });
}
