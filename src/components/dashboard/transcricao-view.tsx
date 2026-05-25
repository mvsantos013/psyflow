import { useState } from "react";
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
import { mockPacientes, mockTranscricoes } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TranscricaoView() {
  const [pacienteId, setPacienteId] = useState<string>("p1");
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done"
  >("idle");

  const pacientesAtivos = mockPacientes.filter((p) => p.status === "ativo");
  const transcricao = mockTranscricoes[pacienteId];

  const handleUpload = () => {
    setStatus("uploading");
    setTimeout(() => {
      setStatus("processing");
      setTimeout(() => {
        setStatus("done");
      }, 2500);
    }, 1500);
  };

  const handleEnviarTarefas = () => {
    alert("Tarefas enviadas para o app do paciente com sucesso!");
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Paciente</label>
            <Select value={pacienteId} onValueChange={(v) => { setPacienteId(v); setStatus("idle"); }}>
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
