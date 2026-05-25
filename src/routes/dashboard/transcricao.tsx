import { createFileRoute } from "@tanstack/react-router";
import { TranscricaoView } from "@/components/dashboard/transcricao-view";

export const Route = createFileRoute("/dashboard/transcricao")({
  component: TranscricaoPage,
});

function TranscricaoPage() {
  return <TranscricaoView />;
}
