import { useQuery } from "@tanstack/react-query";
import { normalizePatient } from "@/lib/api-normalizers";
import { apiFetch } from "@/lib/api";
import type { Paciente } from "@/lib/ui-types";

async function fetchPacientes(): Promise<Paciente[]> {
  const res = await apiFetch("/api/patients");
  if (!res.ok) throw new Error("Falha ao buscar pacientes");
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizePatient) : [];
}

export function usePacientes() {
  return useQuery({
    queryKey: ["pacientes"],
    queryFn: fetchPacientes,
  });
}
