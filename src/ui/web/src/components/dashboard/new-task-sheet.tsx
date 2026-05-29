import { useState } from "react";
import { BookOpen, Plus, Dumbbell, Headphones, NotebookPen, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddTarefa, type NovaTarefaInput } from "@/hooks/use-prontuario";
import { useExercicios } from "@/hooks/use-exercicios";
import { toast } from "sonner";
import type { ExerciseTemplate } from "@/lib/ui-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<ExerciseTemplate["type"], string> = {
  exercise: "Exercício",
  audio: "Áudio",
  journal: "Diário",
  habit: "Hábito",
};

const TIPO_ICONS: Record<ExerciseTemplate["type"], React.ElementType> = {
  exercise: Dumbbell,
  audio: Headphones,
  journal: NotebookPen,
  habit: Repeat2,
};

const TIPO_COLORS: Record<ExerciseTemplate["type"], string> = {
  exercise: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  audio: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  journal: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  habit: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const TIPO_OPTIONS: ExerciseTemplate["type"][] = ["exercise", "audio", "journal", "habit"];

// ─── Component ────────────────────────────────────────────────────────────────

interface NewTaskSheetProps {
  pacienteId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewTaskSheet({ pacienteId, open, onOpenChange }: NewTaskSheetProps) {
  const [aba, setAba] = useState<"nova" | "biblioteca">("nova");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<ExerciseTemplate["type"] | "">("");

  const { mutate, isPending } = useAddTarefa(pacienteId);
  const { data: exercicios = [] } = useExercicios();

  function reset() {
    setAba("nova");
    setTitulo("");
    setDescricao("");
    setTipo("");
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  /** Pre-fill the form from a library template and switch to "nova" tab. */
  function handleSelectTemplate(ex: ExerciseTemplate) {
    setTitulo(ex.title);
    setDescricao(ex.description);
    setTipo(ex.type);
    setAba("nova");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !tipo) return;
    const input: NovaTarefaInput = {
      title: titulo.trim(),
      description: descricao.trim(),
      type: tipo,
    };
    mutate(input, {
      onSuccess: () => {
        toast.success("Tarefa prescrita com sucesso");
        handleClose();
      },
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Prescrever tarefa</SheetTitle>
        </SheetHeader>

        <Tabs
          value={aba}
          onValueChange={(v) => setAba(v as "nova" | "biblioteca")}
          className="flex flex-col flex-1 min-h-0 pt-2"
        >
          <TabsList className="w-full">
            <TabsTrigger value="nova" className="flex-1 gap-2">
              <Plus className="h-3.5 w-3.5" />
              Nova tarefa
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="flex-1 gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Da biblioteca
            </TabsTrigger>
          </TabsList>

          {/* ── Nova tarefa ────────────────────────────────────────────── */}
          <TabsContent value="nova" className="flex-1 mt-4" asChild>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full">
              <div className="space-y-1.5">
                <Label htmlFor="tarefa-titulo">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tarefa-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Diário de gratidão"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tarefa-tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as ExerciseTemplate["type"])}>
                  <SelectTrigger id="tarefa-tipo">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => {
                      const Icon = TIPO_ICONS[t];
                      return (
                        <SelectItem key={t} value={t}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            {TIPO_LABELS[t]}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1">
                <Label htmlFor="tarefa-desc">Descrição / Instruções</Label>
                <Textarea
                  id="tarefa-desc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que o paciente deve fazer e como..."
                  rows={5}
                />
              </div>

              <SheetFooter className="pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!titulo.trim() || !tipo || isPending}>
                  {isPending ? "Prescrevendo..." : "Prescrever tarefa"}
                </Button>
              </SheetFooter>
            </form>
          </TabsContent>

          {/* ── Biblioteca ─────────────────────────────────────────────── */}
          <TabsContent value="biblioteca" className="flex-1 mt-4 min-h-0">
            {exercicios.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <BookOpen className="h-7 w-7 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Biblioteca vazia. Adicione exercícios na tela de Exercícios.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-auto max-h-[calc(100vh-18rem)] pr-1">
                {exercicios.map((ex) => {
                  const Icon = TIPO_ICONS[ex.type];
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleSelectTemplate(ex)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-primary/50 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {ex.title}
                        </p>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${TIPO_COLORS[ex.type]}`}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {TIPO_LABELS[ex.type]}
                        </span>
                      </div>
                      {ex.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {ex.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
