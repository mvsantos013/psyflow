import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeExercise } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { ExerciseTemplate } from "@/lib/ui-types";

async function fetchExercicios(): Promise<ExerciseTemplate[]> {
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
  title: string;
  description: string;
  type: ExerciseTemplate["type"];
};

async function postNovoExercicio(input: NovoExercicioInput): Promise<ExerciseTemplate> {
  const res = await apiFetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      type: input.type,
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
