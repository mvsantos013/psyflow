import { createFileRoute } from "@tanstack/react-router";
import { ProntuarioView } from "@/components/dashboard/prontuario-view";

export const Route = createFileRoute("/dashboard/pacientes/$id")({
  component: ProntuarioPage,
});

function ProntuarioPage() {
  const { id } = Route.useParams();
  return <ProntuarioView pacienteId={id} />;
}
