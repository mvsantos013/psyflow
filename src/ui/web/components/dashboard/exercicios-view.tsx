import { useState } from "react";
import { BookOpen, Plus, Dumbbell, Headphones, NotebookPen, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExercicios, useAddExercicio, type NovoExercicioInput } from "@/hooks/use-exercicios";
import type { ExercicioTemplate } from "@/ui/web/lib/mock-data";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<ExercicioTemplate["tipo"], string> = {
  exercicio: "Exercício",
  audio: "Áudio",
  diario: "Diário",
  habito: "Hábito",
};

const TIPO_ICONS: Record<ExercicioTemplate["tipo"], React.ElementType> = {
  exercicio: Dumbbell,
  audio: Headphones,
  diario: NotebookPen,
  habito: Repeat2,
};

const TIPO_COLORS: Record<ExercicioTemplate["tipo"], string> = {
  exercicio: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  audio: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  diario: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  habito: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

// ─── Novo exercício Sheet ─────────────────────────────────────────────────────

const TIPO_OPTIONS: ExercicioTemplate["tipo"][] = ["exercicio", "audio", "diario", "habito"];

function NovoExercicioSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<ExercicioTemplate["tipo"] | "">("");
  const { mutate, isPending } = useAddExercicio();

  function reset() {
    setTitulo("");
    setDescricao("");
    setTipo("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !tipo) return;
    const input: NovoExercicioInput = { titulo: titulo.trim(), descricao: descricao.trim(), tipo };
    mutate(input, {
      onSuccess: () => {
        toast.success("Exercício adicionado à biblioteca");
        reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Novo exercício</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-titulo">Título <span className="text-destructive">*</span></Label>
            <Input
              id="ex-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Respiração 4-7-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-tipo">Tipo <span className="text-destructive">*</span></Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ExercicioTemplate["tipo"])}>
              <SelectTrigger id="ex-tipo">
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1">
            <Label htmlFor="ex-desc">Descrição / Instruções</Label>
            <Textarea
              id="ex-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o exercício e como o paciente deve realizá-lo..."
              rows={5}
            />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!titulo.trim() || !tipo || isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ExerciciosView() {
  const [sheetAberto, setSheetAberto] = useState(false);
  const { data: exercicios = [], isLoading } = useExercicios();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Biblioteca de Exercícios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Templates reutilizáveis para prescrever tarefas aos pacientes.
          </p>
        </div>
        <Button onClick={() => setSheetAberto(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo exercício
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : exercicios.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum exercício na biblioteca ainda.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setSheetAberto(true)}>
            <Plus className="h-4 w-4" />
            Adicionar primeiro exercício
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercicios.map((ex) => {
            const Icon = TIPO_ICONS[ex.tipo];
            return (
              <div
                key={ex.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-snug">{ex.titulo}</p>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${TIPO_COLORS[ex.tipo]}`}
                  >
                    <Icon className="h-3 w-3" />
                    {TIPO_LABELS[ex.tipo]}
                  </span>
                </div>
                {ex.descricao && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {ex.descricao}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NovoExercicioSheet open={sheetAberto} onOpenChange={setSheetAberto} />
    </div>
  );
}
