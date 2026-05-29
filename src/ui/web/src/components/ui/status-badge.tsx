import type { Patient } from "@/lib/ui-types";

const STATUS_STYLES: Record<Patient["status"], string> = {
  active: "bg-chart-2/10 text-chart-2",
  discharged: "bg-primary/10 text-primary",
  inactive: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<Patient["status"], string> = {
  active: "Ativo",
  discharged: "Alta",
  inactive: "Inativo",
  archived: "Arquivado",
};

export function StatusBadge({ status }: { status: Patient["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
