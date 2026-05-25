import { createFileRoute } from "@tanstack/react-router";
import { PacientesList } from "@/components/dashboard/pacientes-list";

export const Route = createFileRoute("/dashboard/pacientes/")({
  component: PacientesIndexPage,
});

function PacientesIndexPage() {
  return <PacientesList />;
}