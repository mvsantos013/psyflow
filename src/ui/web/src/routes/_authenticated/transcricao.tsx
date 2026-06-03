import { createFileRoute } from "@tanstack/react-router";
import { TranscriptionView } from "@/components/dashboard/transcription-view";

export const Route = createFileRoute("/_authenticated/transcricao")({
  component: TranscriptionPage,
});

function TranscriptionPage() {
  return <TranscriptionView />;
}
