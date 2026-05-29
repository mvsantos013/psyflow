import { createFileRoute } from "@tanstack/react-router";
import { PatientsList } from "@/components/dashboard/patients-list";

export const Route = createFileRoute("/dashboard/pacientes/")({
  component: PatientsIndexPage,
});

function PatientsIndexPage() {
  return <PatientsList />;
}
