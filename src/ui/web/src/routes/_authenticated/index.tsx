import { createFileRoute } from "@tanstack/react-router";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardHomePage,
});

function DashboardHomePage() {
  return <DashboardHome />;
}
