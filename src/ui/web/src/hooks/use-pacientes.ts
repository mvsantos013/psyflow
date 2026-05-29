import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizePatient } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { Patient } from "@/lib/ui-types";

export type CreatePacienteInput = {
  name: string;
  email: string;
  birthDate: string;
  treatmentStartDate: string;
};

async function fetchPatients(): Promise<Patient[]> {
  const res = await apiFetch("/api/patients");
  if (!res.ok) throw new Error("Falha ao buscar pacientes");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizePatient) : [];
}

async function createPatient(input: CreatePacienteInput): Promise<Patient> {
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
    queryFn: fetchPatients,
  });
}

export function useCreatePaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPatient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
