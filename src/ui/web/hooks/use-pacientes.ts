import { useQuery } from "@tanstack/react-query";
import type { Paciente } from "@/ui/web/lib/mock-data";
import { apiFetch } from "@/ui/web/lib/api";

async function fetchPacientes(): Promise<Paciente[]> {
  const res = await apiFetch("/api/patients");
  if (!res.ok) throw new Error("Falha ao buscar pacientes");
  return res.json();
}

export function usePacientes() {
  return useQuery({
    queryKey: ["pacientes"],
    queryFn: fetchPacientes,
  });
}
