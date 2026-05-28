import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin, Video } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAddSessao, type NovaSessaoInput } from "@/hooks/use-prontuario";

// ─── Schema ──────────────────────────────────────────────────────────────────
//
// id, pacienteId, insights, temTranscricao e conclusoesIA são gerenciados
// pelo servidor e não aparecem neste formulário.

const novaSessaoSchema = z.object({
  /** ISO date string (yyyy-mm-dd). */
  data: z.string().min(1, "Informe a data da sessão"),
  tipo: z.enum(["presencial", "remota"]),
  /** Duração em minutos. */
  duracao: z
    .coerce
    .number({ invalid_type_error: "Duração obrigatória" })
    .min(5, "Mínimo 5 min")
    .max(240, "Máximo 240 min"),
  /** Escala 1–10. Opcional: o profissional pode não registrar na hora. */
  humorInicio: z.number().min(1).max(10).optional(),
  humorFim: z.number().min(1).max(10).optional(),
  resumo: z.string().optional(),
});

type FormValues = z.infer<typeof novaSessaoSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today's date in yyyy-mm-dd format for use as the default value. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_DEFAULTS: FormValues = {
  data: todayIso(),
  tipo: "presencial",
  duracao: 50,
  humorInicio: undefined,
  humorFim: undefined,
  resumo: "",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface NovaSessaoSheetProps {
  pacienteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the id of the newly created session so the parent can auto-select it. */
  onSessaoCriada: (sessaoId: string) => void;
}

export function NovaSessaoSheet({
  pacienteId,
  open,
  onOpenChange,
  onSessaoCriada,
}: NovaSessaoSheetProps) {
  const { mutate, isPending } = useAddSessao(pacienteId);

  const form = useForm<FormValues>({
    resolver: zodResolver(novaSessaoSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  function onSubmit(values: FormValues) {
    mutate(values as NovaSessaoInput, {
      onSuccess: (sessao) => {
        toast.success("Sessão registrada com sucesso");
        onSessaoCriada(sessao.id);
        onOpenChange(false);
        form.reset({ ...EMPTY_DEFAULTS, data: todayIso() });
      },
      onError: () => {
        toast.error("Erro ao registrar sessão. Tente novamente.");
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Sessão</SheetTitle>
          <SheetDescription>
            Preencha os dados básicos. Resumo detalhado e conclusões podem ser
            adicionados depois na view da sessão.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            {/* ── Data ─────────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Modalidade ───────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidade *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {(["presencial", "remota"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => field.onChange(t)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            field.value === t
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:border-muted-foreground/40 hover:bg-muted/40"
                          }`}
                        >
                          {t === "presencial" ? (
                            <MapPin className="h-4 w-4" />
                          ) : (
                            <Video className="h-4 w-4" />
                          )}
                          {t === "presencial" ? "Presencial" : "Remota"}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Duração ──────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="duracao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos) *</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} max={240} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Humor início ─────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="humorInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Humor no início</span>
                    <span className="font-normal text-muted-foreground">
                      {field.value ?? "—"} / 10
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={field.value !== undefined ? [field.value] : [5]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Humor fim ────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="humorFim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Humor ao final</span>
                    <span className="font-normal text-muted-foreground">
                      {field.value ?? "—"} / 10
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={field.value !== undefined ? [field.value] : [5]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Notas ────────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="resumo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas da sessão</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações iniciais sobre a sessão..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar Sessão
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
