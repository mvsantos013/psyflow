import { createFileRoute } from "@tanstack/react-router";
import { ExercisesView } from "@/components/dashboard/exercises-view";

export const Route = createFileRoute("/dashboard/exercicios")({
  component: ExercisesPage,
});

function ExercisesPage() {
  return <ExercisesView />;
}
