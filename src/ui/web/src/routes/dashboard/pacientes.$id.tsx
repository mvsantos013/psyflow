import { createFileRoute } from "@tanstack/react-router";
import { PatientRecordView } from "@/components/dashboard/patient-record-view";

export const Route = createFileRoute("/dashboard/pacientes/$id")({
  component: PatientRecordPage,
});

function PatientRecordPage() {
  const { id } = Route.useParams();
  return <PatientRecordView pacienteId={id} />;
}
