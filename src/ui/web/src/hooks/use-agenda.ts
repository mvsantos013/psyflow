import { useQuery } from "@tanstack/react-query";
import { normalizeAgendaEntry, normalizeTranscription } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { AgendaEntry, TranscricaoResult } from "@/lib/ui-types";

async function fetchAgendaSessoes(): Promise<AgendaEntry[]> {
  const res = await apiFetch("/api/sessions/agenda");
  if (!res.ok) throw new Error("Falha ao buscar agenda");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeAgendaEntry) : [];
}

async function fetchTranscricao(pacienteId: string): Promise<TranscricaoResult> {
  const res = await apiFetch(`/api/patients/${pacienteId}/transcription`);
  if (!res.ok) throw new Error("Transcrição não encontrada");
  const data = await res.json();
  return normalizeTranscription(data);
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
