import type { Paciente } from "@/ui/web/lib/mock-data";

const STATUS_STYLES: Record<Paciente["status"], string> = {
  ativo: "bg-chart-2/10 text-chart-2",
  alta: "bg-primary/10 text-primary",
  inativo: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<Paciente["status"], string> = {
  ativo: "Ativo",
  alta: "Alta",
  inativo: "Inativo",
};

export function StatusBadge({ status }: { status: Paciente["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
