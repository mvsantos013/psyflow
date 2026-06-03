import { createFileRoute } from "@tanstack/react-router";
import { ExercisesView } from "@/components/dashboard/exercises-view";

export const Route = createFileRoute("/_authenticated/exercicios")({
  component: ExercisesPage,
});

function ExercisesPage() {
  return <ExercisesView />;
}
