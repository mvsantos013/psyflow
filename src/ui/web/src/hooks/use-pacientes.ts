import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizePatient } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { Paciente } from "@/lib/ui-types";

export type CreatePacienteInput = {
  name: string;
  email: string;
  birthDate: string;
  treatmentStartDate: string;
};

async function fetchPacientes(): Promise<Paciente[]> {
  const res = await apiFetch("/api/patients");
  if (!res.ok) throw new Error("Falha ao buscar pacientes");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizePatient) : [];
}

async function createPaciente(input: CreatePacienteInput): Promise<Paciente> {
  const res = await apiFetch("/api/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Falha ao criar paciente");
  return normalizePatient(await res.json());
}

export function usePacientes() {
  return useQuery({
    queryKey: ["pacientes"],
    queryFn: fetchPacientes,
  });
}

export function useCreatePaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaciente,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
