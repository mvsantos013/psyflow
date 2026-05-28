import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExercicioTemplate } from "@/ui/web/lib/mock-data";
import { apiFetch } from "@/ui/web/lib/api";

async function fetchExercicios(): Promise<ExercicioTemplate[]> {
  const res = await apiFetch("/api/exercises");
  if (!res.ok) throw new Error("Erro ao buscar exercícios");
  return res.json();
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
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Erro ao criar exercício");
  return res.json();
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
