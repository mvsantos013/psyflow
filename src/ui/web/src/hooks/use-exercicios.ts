import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeExercise, toApiTaskType } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { ExercicioTemplate } from "@/lib/ui-types";

async function fetchExercicios(): Promise<ExercicioTemplate[]> {
  const res = await apiFetch("/api/exercises");
  if (!res.ok) throw new Error("Erro ao buscar exercícios");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeExercise) : [];
}

export function useExercicios() {
  return useQuery({
    queryKey: ["exercicios"],
    queryFn: fetchExercicios,
  });
}

export type NovoExercicioInput = {
  titulo: string;
  descricao: string;
  tipo: ExercicioTemplate["tipo"];
};

async function postNovoExercicio(input: NovoExercicioInput): Promise<ExercicioTemplate> {
  const res = await apiFetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.titulo,
      description: input.descricao,
      type: toApiTaskType(input.tipo),
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar exercício");
  const data = await res.json();
  return normalizeExercise(data);
}

export function useAddExercicio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postNovoExercicio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercicios"] });
    },
  });
}
