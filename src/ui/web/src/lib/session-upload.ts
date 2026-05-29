import { apiFetch } from "@/lib/api";
import { toApiSessionType } from "@/lib/api-normalizers";
import { withRetry } from "@/lib/retry";

type SessionPatchPayload = {
  audioS3Key?: string;
  transcriptionS3Key?: string;
  transcriptionStatus?: "none" | "processing" | "done";
};

type PresignedUploadResponse = {
  uploadUrl: string;
  key: string;
  headers?: Record<string, string>;
};

function buildUploadHeaders(file: File, presignedHeaders?: Record<string, string>): Headers {
  const uploadHeaders = new Headers();

  if (presignedHeaders?.["Content-Type"]) {
    uploadHeaders.set("Content-Type", presignedHeaders["Content-Type"]);
  } else if (file.type) {
    uploadHeaders.set("Content-Type", file.type);
  }

  if (presignedHeaders?.["x-amz-server-side-encryption"]) {
    uploadHeaders.set(
      "x-amz-server-side-encryption",
      presignedHeaders["x-amz-server-side-encryption"]
    );
  }

  return uploadHeaders;
}

export async function patchSessionMetadata(
  sessionId: string,
  patientId: string,
  payload: SessionPatchPayload
): Promise<void> {
  const response = await withRetry(
    () =>
      apiFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, ...payload }),
      }),
    { stepLabel: "Falha ao atualizar metadados da sessão" }
  );

  if (!response.ok) {
    throw new Error("Falha ao atualizar metadados da sessão");
  }
}

export async function ensureSessionForPatient(
  patientId: string,
  existingSessionId?: string
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
          type: toApiSessionType("remota"),
          duration: 50,
          summary: "Sessão criada automaticamente para fluxo de transcrição.",
        }),
      }),
    { stepLabel: "Falha ao criar sessão para upload" }
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
  file: File
): Promise<{ audioS3Key: string }> {
  const presignRes = await withRetry(
    () =>
      apiFetch("/api/uploads/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          sessionId,
          filename: file.name,
          contentType: file.type || "audio/mpeg",
        }),
      }),
    { stepLabel: "Falha ao gerar URL de upload" }
  );

  if (!presignRes.ok) {
    throw new Error("Falha ao gerar URL de upload");
  }

  const presigned = (await presignRes.json()) as PresignedUploadResponse;
  const uploadHeaders = buildUploadHeaders(file, presigned.headers);

  const uploadRes = await withRetry(
    () =>
      fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file,
      }),
    { stepLabel: "Falha no upload para armazenamento" }
  );

  if (!uploadRes.ok) {
    throw new Error("Falha no upload para armazenamento");
  }

  await patchSessionMetadata(sessionId, patientId, {
    audioS3Key: presigned.key,
    transcriptionStatus: "processing",
  });

  return { audioS3Key: presigned.key };
}

export async function saveSessionTranscriptionAndMarkDone(
  sessionId: string,
  patientId: string,
  transcription: string,
  audioS3Key?: string
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
    { stepLabel: "Falha ao salvar transcrição" }
  );

  if (!response.ok) {
    throw new Error("Falha ao salvar transcrição");
  }

  await patchSessionMetadata(sessionId, patientId, {
    transcriptionStatus: "done",
  });
}
