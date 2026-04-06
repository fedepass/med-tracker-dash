import React from "react";
import {
  CheckCircle2, Loader, AlertTriangle, Clock, PencilLine,
  ShieldCheck, ShieldX,
  Beaker, FlaskConical, Package, Camera,
} from "lucide-react";
import type { Status, ValidationStatus, Priority } from "@/data/preparations";

export const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string; bgClassName: string }> = {
  completata: { icon: React.createElement(CheckCircle2, { className: "h-5 w-5" }), label: "Completata", className: "text-status-complete", bgClassName: "bg-status-complete-bg" },
  esecuzione: { icon: React.createElement(Loader, { className: "h-5 w-5" }), label: "In esecuzione", className: "text-status-progress", bgClassName: "bg-status-progress-bg" },
  errore:     { icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }), label: "Errore", className: "text-status-error", bgClassName: "bg-status-error-bg" },
  attesa:     { icon: React.createElement(Clock, { className: "h-5 w-5" }), label: "Da eseguire", className: "text-status-waiting", bgClassName: "bg-status-waiting-bg" },
  corretta:   { icon: React.createElement(PencilLine, { className: "h-5 w-5" }), label: "Corretta", className: "text-status-corretta", bgClassName: "bg-status-corretta-bg" },
  warning_dosaggio: { icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }), label: "Warning dosaggio", className: "text-status-warning-dosaggio", bgClassName: "bg-status-warning-dosaggio-bg" },
  fallita: { icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }), label: "Fallita", className: "text-status-error", bgClassName: "bg-status-error-bg" },
};

export const validationConfig: Record<NonNullable<ValidationStatus>, { icon: React.ReactNode; label: string; className: string; bgClassName: string }> = {
  validata:  { icon: React.createElement(ShieldCheck, { className: "h-5 w-5" }), label: "Validata", className: "text-status-complete", bgClassName: "bg-status-complete-bg" },
  rifiutata: { icon: React.createElement(ShieldX, { className: "h-5 w-5" }), label: "Rifiutata", className: "text-status-error", bgClassName: "bg-status-error-bg" },
};

export const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta:  { label: "Priorità Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Priorità Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Priorità Bassa", className: "bg-status-complete-bg text-status-complete" },
};

export const photoTypeIcon: Record<string, React.ReactNode> = {
  farmaco:      React.createElement(Beaker, { className: "h-4 w-4" }),
  diluente:     React.createElement(FlaskConical, { className: "h-4 w-4" }),
  contenitore:  React.createElement(Package, { className: "h-4 w-4" }),
  preparazione: React.createElement(Camera, { className: "h-4 w-4" }),
};

/** Combines a date (YYYY-MM-DD) with a time (HH:MM or HH:MM:SS) → "DD/MM/YYYY HH:MM" */
export function formatDT(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !time) return null;
  const d = String(date).slice(0, 10);
  const t = String(time).slice(0, 5);
  const [y, mo, dd] = d.split("-");
  return `${dd}/${mo}/${y} ${t}`;
}

/** Formats an ISO timestamp → "DD/MM/YYYY HH:MM" */
export function formatTS(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return null;
  return (
    dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}

/** Calculates duration between two "DD/MM/YYYY HH:MM:SS" strings */
export function calcDuration(start: string, end: string): string {
  const toSeconds = (s: string) => {
    const parts = s.split(" ");
    if (parts.length < 2) return NaN;
    const [dd, mo, yyyy] = parts[0].split("/").map(Number);
    const [hh, mm, ss = 0] = parts[1].split(":").map(Number);
    return Date.UTC(yyyy, mo - 1, dd, hh, mm, ss) / 1000;
  };
  const diff = toSeconds(end) - toSeconds(start);
  if (!isFinite(diff) || diff <= 0) return "—";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  return `${s}s`;
}
