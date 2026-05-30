import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseIsoDate(date: string): Date | null {
  if (!date || typeof date !== "string") return null;
  const [y, m, day] = date.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    return null;
  }
  const parsed = new Date(y, m - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatData(d: string): string {
  const parsed = parseIsoDate(d);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDataCurta(d: string): string {
  const parsed = parseIsoDate(d);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export function formatHora(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function formatDiaLabel(d: Date): string {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === hoje.getTime()) return "Hoje";
  if (dd.getTime() === amanha.getTime()) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
