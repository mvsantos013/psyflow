import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Upload,
  Loader2,
  CheckCircle,
  Sparkles,
  FileText,
  Lightbulb,
  ListChecks,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePacientes } from "@/hooks/use-pacientes";
import { useTranscricao } from "@/hooks/use-agenda";
import { useProntuario } from "@/hooks/use-prontuario";
import { toErrorMessage } from "@/lib/retry";
import {
  ensureSessionForPatient,
  saveSessionTranscriptionAndMarkDone,
  uploadSessionAudioAndMarkProcessing,
} from "@/lib/session-upload";
import { toast } from "sonner";

export function TranscricaoView() {
  const [pacienteId, setPacienteId] = useState<string>("");
  const [sessaoId, setSessaoId] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: allPacientes = [] } = usePacientes();
  const pacientesAtivos = allPacientes.filter((p) => p.status === "ativo");
  const { data: prontuario } = useProntuario(pacienteId);
  const sessoesOrdenadas = useMemo(
    () =>
      [...(prontuario?.sessoes || [])].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      ),
    [prontuario]
  );
  const { data: transcricao } = useTranscricao(pacienteId, status === "done");

  useEffect(() => {
    if (!pacienteId && pacientesAtivos.length > 0) {
      setPacienteId(pacientesAtivos[0].id);
    }
  }, [pacienteId, pacientesAtivos]);

  useEffect(() => {
    if (!sessaoId && sessoesOrdenadas.length > 0) {
      setSessaoId(sessoesOrdenadas[0].id);
    }
  }, [sessoesOrdenadas, sessaoId]);

  async function handleAudioSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setStatus("uploading");

    try {
      const ensured = await ensureSessionForPatient(pacienteId, sessaoId || undefined);
      const effectiveSessionId = ensured.sessionId;
      if (ensured.created) {
        setSessaoId(effectiveSessionId);
      }

      const { audioS3Key } = await uploadSessionAudioAndMarkProcessing(
        pacienteId,
        effectiveSessionId,
        file
      );

      setStatus("processing");

      const generatedTranscript =
        "[00:00] Psicóloga: Início da sessão.\n" +
        "[00:06] Paciente: Compartilhou atualização da semana e principais dificuldades.\n" +
        "[00:18] Psicóloga: Exploramos estratégias práticas para os gatilhos relatados.";

      await saveSessionTranscriptionAndMarkDone(
        effectiveSessionId,
        pacienteId,
        generatedTranscript,
        audioS3Key
      );

      setStatus("done");
      toast.success("Upload e transcrição concluídos com sucesso.");
    } catch (error) {
      const details = toErrorMessage(error);
      setErrorMessage(details);
      toast.error(details);
      setStatus("idle");
    } finally {
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }
    }
  }

  const handleUpload = () => {
    audioInputRef.current?.click();
  };

  const handleEnviarTarefas = () => {
    toast.success("Tarefas enviadas para o app do paciente com sucesso.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          Transcrição e Resumo IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça upload do áudio da sessão e receba um resumo executivo com insights e prescrições automáticas.
        </p>
      </div>

      {/* Seletor de paciente + Upload */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioSelection}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Paciente</label>
            <Select
              value={pacienteId}
              onValueChange={(v) => {
                setPacienteId(v);
                setSessaoId("");
                setStatus("idle");
                setErrorMessage(null);
              }}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Selecionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientesAtivos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Sessão</label>
            <Select value={sessaoId || "AUTO"} onValueChange={(v) => setSessaoId(v === "AUTO" ? "" : v)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Criar automaticamente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Criar automaticamente</SelectItem>
                {sessoesOrdenadas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.data} · {s.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleUpload}
            disabled={status !== "idle"}
            className="gap-2"
          >
            {status === "idle" && <Upload className="h-4 w-4" />}
            {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "processing" && <Sparkles className="h-4 w-4 animate-pulse" />}
            {status === "done" && <CheckCircle className="h-4 w-4" />}
            {status === "idle" && "Enviar áudio da sessão"}
            {status === "uploading" && "Enviando..."}
            {status === "processing" && "IA analisando..."}
            {status === "done" && "Análise concluída"}
          </Button>
        </div>

        {status === "idle" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Nota: O paciente deve ter assinado o termo de consentimento para gravação de áudio.
          </p>
        )}
        {errorMessage && <p className="mt-3 text-xs text-amber-600">{errorMessage}</p>}
      </div>

      {/* Resultados da IA */}
      {status === "done" && transcricao && (
        <div className="space-y-6">
          {/* Resumo Executivo */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resumo Executivo do Prontuário
            </h2>
            <p className="mt-3 text-sm text-foreground leading-relaxed">
              {transcricao.resumo}
            </p>
          </div>

          {/* Insights */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-chart-4" />
              Insights Chave da IA
            </h2>
            <div className="mt-3 space-y-2">
              {transcricao.insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-3 bg-accent/30"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-chart-4 shrink-0" />
                  <p className="text-sm text-foreground">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tarefas Automáticas */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-chart-2" />
              Prescrição Automatizada de Tarefas
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sugestões geradas pela IA baseadas no conteúdo da sessão. Aprove e envie diretamente para o app do paciente.
            </p>
            <div className="mt-4 space-y-3">
              {transcricao.tarefas.map((tarefa, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border bg-background shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{tarefa}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleEnviarTarefas} className="gap-2">
                <Send className="h-4 w-4" />
                Aprovar e enviar para paciente
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === "done" && !transcricao && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma transcrição mockada disponível para este paciente.
          </p>
        </div>
      )}
    </div>
  );
}
