import { useSyncExternalStore } from "react";

// Pagamentos pré-marcados (mock inicial)
const paidSet = new Set<string>([
  "s2", // sessão histórica do p1 já paga
  "s5", // sessão histórica do p3 já paga
]);

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function isPaid(id: string) {
  return paidSet.has(id);
}

export function togglePaid(id: string) {
  if (paidSet.has(id)) paidSet.delete(id);
  else paidSet.add(id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  // Serializa as chaves ordenadas para garantir referência estável quando
  // o conteúdo não mudou.
  return Array.from(paidSet).sort().join("|");
}

export function usePagamentos() {
  // Força rerender quando o set muda
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { isPaid, togglePaid };
}

// ID estável para sessões da agenda (calendário)
export function agendaSessaoId(opts: {
  data: Date;
  hora: number;
  pacienteId: string;
}) {
  const y = opts.data.getFullYear();
  const m = (opts.data.getMonth() + 1).toString().padStart(2, "0");
  const d = opts.data.getDate().toString().padStart(2, "0");
  return `cal-${y}-${m}-${d}-${opts.hora}-${opts.pacienteId}`;
}