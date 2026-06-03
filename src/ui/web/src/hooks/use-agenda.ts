import { useQuery } from "@tanstack/react-query";
import { normalizeTranscription } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { TranscriptionResult } from "@/lib/ui-types";

async function fetchTranscricao(patientId: string): Promise<TranscriptionResult> {
  const res = await apiFetch(`/api/patients/${patientId}/transcription`);
  if (!res.ok) throw new Error("Transcrição não encontrada");
  const data = await res.json();
  return normalizeTranscription(data);
}

export function useTranscricao(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["transcricao", patientId],
    queryFn: () => fetchTranscricao(patientId),
    enabled: !!patientId && enabled,
  });
}
