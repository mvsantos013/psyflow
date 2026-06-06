import { apiFetch } from "@/lib/api";
import { withRetry } from "@/lib/retry";

type EncryptedUploadResponse = {
  audioS3Key: string;
};

export async function ensureSessionForPatient(
  patientId: string,
  existingSessionId?: string,
): Promise<{ sessionId: string; created: boolean }> {
  if (existingSessionId) {
    return { sessionId: existingSessionId, created: false };
  }

  const today = new Date().toISOString().slice(0, 10);
  const response = await withRetry(
    () =>
      apiFetch(`/api/patients/${patientId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          type: "remote",
          duration: 50,
          summary: "Sessão criada automaticamente para fluxo de transcrição.",
        }),
      }),
    { stepLabel: "Falha ao criar sessão para upload" },
  );

  if (!response.ok) {
    throw new Error("Falha ao criar sessão para upload");
  }

  const created = (await response.json()) as { id: string };
  return { sessionId: created.id, created: true };
}

export async function uploadSessionAudioAndMarkProcessing(
  patientId: string,
  sessionId: string,
  file: File,
): Promise<{ audioS3Key: string }> {
  const formData = new FormData();
  formData.set("patientId", patientId);
  formData.set("audio", file);

  const uploadRes = await withRetry(
    () =>
      apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/audio`, {
        method: "POST",
        body: formData,
      }),
    { stepLabel: "Falha no upload para armazenamento" },
  );

  if (!uploadRes.ok) {
    throw new Error("Falha no upload para armazenamento");
  }

  const data = (await uploadRes.json()) as EncryptedUploadResponse;
  if (!data.audioS3Key) {
    throw new Error("Falha no upload para armazenamento");
  }
  return { audioS3Key: data.audioS3Key };
}

export async function saveSessionTranscriptionAndMarkDone(
  sessionId: string,
  patientId: string,
  transcription: string,
  audioS3Key?: string,
): Promise<void> {
  const response = await withRetry(
    () =>
      apiFetch(`/api/sessions/${sessionId}/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          transcription,
          audioS3Key,
          storeInS3: true,
        }),
      }),
    { stepLabel: "Falha ao salvar transcrição" },
  );

  if (!response.ok) {
    throw new Error("Falha ao salvar transcrição");
  }
}

export async function getSessionAudioPlaybackBlobUrl(
  sessionId: string,
  patientId: string,
): Promise<string> {
  const response = await withRetry(
    () =>
      apiFetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/audio?patientId=${encodeURIComponent(patientId)}`,
      ),
    { stepLabel: "Falha ao carregar áudio da sessão" },
  );

  if (!response.ok) {
    throw new Error("Falha ao carregar áudio da sessão");
  }

  const payload = await response.blob();
  return URL.createObjectURL(payload);
}
