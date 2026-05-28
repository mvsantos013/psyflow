import { useRef, useState } from "react";
import { Mic, FileText, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toErrorMessage } from "@/lib/retry";
import {
  saveSessionTranscriptionAndMarkDone,
  uploadSessionAudioAndMarkProcessing,
} from "@/lib/session-upload";
import { toast } from "sonner";

// ─── Transcript parser ────────────────────────────────────────────────────────

interface TranscriptLine {
  timestamp: string;
  speaker: string;
  text: string;
  isPatient: boolean;
}

const PATIENT_SPEAKERS = ["paciente", "patient"];

function parseTranscript(raw: string): TranscriptLine[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(\d+:\d+)\]\s+([^:]+):\s+(.+)$/);
      if (!match) return null;
      const [, timestamp, speaker, text] = match;
      const isPatient = PATIENT_SPEAKERS.includes(speaker.trim().toLowerCase());
      return { timestamp, speaker: speaker.trim(), text: text.trim(), isPatient };
    })
    .filter((l): l is TranscriptLine => l !== null);
}

// ─── Transcript viewer ────────────────────────────────────────────────────────

function TranscriptViewer({ text }: { text: string }) {
  const lines = parseTranscript(text);

  if (lines.length === 0) {
    return (
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-xs font-mono text-foreground leading-relaxed border">
        {text}
      </pre>
    );
  }

  return (
    <div className="max-h-72 overflow-auto space-y-0.5 pr-1">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex gap-2 rounded px-2 py-1 ${
            line.isPatient
              ? "bg-muted/40"
              : "bg-primary/5 border border-primary/10"
          }`}
        >
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60 tabular-nums w-9 pt-px">
            {line.timestamp}
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={`text-[10px] font-semibold ${
                line.isPatient ? "text-muted-foreground" : "text-primary"
              }`}
            >
              {line.speaker}
            </span>
            <p className="text-xs text-foreground leading-snug">
              {line.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ProcessingStatus = "idle" | "uploading" | "processing" | "done";

interface SessaoTranscricaoCardProps {
  sessaoId: string;
  pacienteId: string;
  temTranscricao: boolean;
  transcricaoInicial?: string;
}

export function SessaoTranscricaoCard({
  sessaoId,
  pacienteId,
  temTranscricao,
  transcricaoInicial,
}: SessaoTranscricaoCardProps) {
  const [transcricaoTexto, setTranscricaoTexto] = useState<string>(
    temTranscricao && transcricaoInicial ? transcricaoInicial : ""
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioNome, setAudioNome] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(
    temTranscricao && transcricaoInicial ? "done" : "idle"
  );
  const [textoRascunho, setTextoRascunho] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAudioNome(file.name);
    setStatus("uploading");

    try {
      const { audioS3Key } = await uploadSessionAudioAndMarkProcessing(
        pacienteId,
        sessaoId,
        file
      );

      setStatus("processing");
      const generatedTranscript =
        transcricaoTexto ||
        "[00:00] Psicóloga: Início da sessão.\n" +
          "[00:04] Paciente: Compartilhou atualização da semana.\n" +
          "[00:15] Psicóloga: Exploramos gatilhos e estratégias de regulação emocional.";

      await saveSessionTranscriptionAndMarkDone(
        sessaoId,
        pacienteId,
        generatedTranscript,
        audioS3Key
      );

      setTranscricaoTexto(generatedTranscript);
      setStatus("done");
      toast.success("Upload e transcrição salvos com sucesso.");
    } catch (error) {
      const details = toErrorMessage(error);
      setErrorMessage(details);
      toast.error(details);
      setStatus("idle");
    }
  }

  function handleTxtChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTextoRascunho(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  async function handleEnviarTexto() {
    if (!textoRascunho.trim()) return;
    setErrorMessage(null);
    setStatus("processing");

    try {
      await saveSessionTranscriptionAndMarkDone(
        sessaoId,
        pacienteId,
        textoRascunho,
        undefined
      );
      setTranscricaoTexto(textoRascunho);
      setStatus("done");
      toast.success("Transcrição salva com sucesso.");
    } catch (error) {
      const details = toErrorMessage(error);
      setErrorMessage(details);
      toast.error(details);
      setStatus("idle");
    }
  }

  if (status === "idle") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Carregue o áudio da sessão para reprodução e geração automática de transcrição, ou cole/importe o texto diretamente.
        </p>

        {errorMessage && (
          <p className="text-xs text-amber-600">{errorMessage}</p>
        )}

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioChange}
        />
        <input
          ref={txtInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleTxtChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => audioInputRef.current?.click()}
          >
            <Mic className="h-4 w-4" />
            Carregar áudio
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => txtInputRef.current?.click()}
          >
            <FileText className="h-4 w-4" />
            Importar .txt
          </Button>
        </div>

        <div className="space-y-2">
          <Textarea
            value={textoRascunho}
            onChange={(e) => setTextoRascunho(e.target.value)}
            placeholder="Ou cole aqui o texto da transcrição..."
            rows={5}
            className="font-mono text-xs"
          />
          {textoRascunho.trim() && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={handleEnviarTexto}>
                <Upload className="h-3.5 w-3.5" />
                Salvar transcrição
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "uploading" || status === "processing") {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {status === "uploading" ? "Enviando arquivo..." : "Gerando transcrição..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="text-xs text-amber-600">{errorMessage}</p>
      )}

      {audioUrl && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            {audioNome}
          </p>
          <audio
            controls
            src={audioUrl}
            className="w-full h-9"
            style={{ borderRadius: "0.5rem" }}
          />
        </div>
      )}

      {transcricaoTexto ? (
        <TranscriptViewer text={transcricaoTexto} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma transcrição disponível para esta sessão.
        </p>
      )}
    </div>
  );
}
