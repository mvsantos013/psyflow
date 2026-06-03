import { createFileRoute } from "@tanstack/react-router";
import { PatientsList } from "@/components/dashboard/patients-list";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  component: PatientsIndexPage,
});

function PatientsIndexPage() {
  return <PatientsList />;
}
