import { createFileRoute } from "@tanstack/react-router";
import { ExerciciosView } from "@/components/dashboard/exercicios-view";

export const Route = createFileRoute("/dashboard/exercicios")({
  component: ExerciciosPage,
});

function ExerciciosPage() {
  return <ExerciciosView />;
}
