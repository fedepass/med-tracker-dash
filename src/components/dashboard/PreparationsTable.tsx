import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Loader, AlertTriangle, Clock, Check, X, ArrowRight,
  ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldCheck, ShieldX, PackageOpen, RotateCcw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type Status, type Priority } from "@/data/preparations";
import { usePreparations, type RejectionReason } from "@/context/PreparationsContext";
import RejectDialog from "./RejectDialog";

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string }> = {
  completata: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Completata", className: "text-status-complete" },
  esecuzione: { icon: <Loader className="h-4 w-4" />, label: "In esecuzione", className: "text-status-progress" },
  errore: { icon: <AlertTriangle className="h-4 w-4" />, label: "Errore", className: "text-status-error" },
  attesa: { icon: <Clock className="h-4 w-4" />, label: "Da eseguire", className: "text-status-waiting" },
  validata: { icon: <ShieldCheck className="h-4 w-4" />, label: "Validata", className: "text-status-complete" },
  rifiutata: { icon: <ShieldX className="h-4 w-4" />, label: "Rifiutata", className: "text-status-error" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Priorità Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Priorità Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Priorità Bassa", className: "bg-status-complete-bg text-status-complete" },
};

type SortKey = "id" | "status" | "drug" | "dispensed" | "errorRate" | "executor" | "requestedAt";
type SortDir = "asc" | "desc";

const priorityOrder: Record<Priority, number> = { alta: 0, media: 1, bassa: 2 };
const statusOrder: Record<Status, number> = { errore: 0, attesa: 1, esecuzione: 2, completata: 3, validata: 4, rifiutata: 5 };

interface PreparationsTableProps {
  mode: "active" | "archived";
  statusFilter?: Status | null;
  dateFrom?: string;
  dateTo?: string;
}

const PreparationsTable = ({ mode, statusFilter, dateFrom, dateTo }: PreparationsTableProps) => {
  const navigate = useNavigate();
  const { preparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation } = usePreparations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const filtered = useMemo(() => {
    let data = preparations;

    if (dateFrom) data = data.filter((p) => p.date >= dateFrom);
    if (dateTo) data = data.filter((p) => p.date <= dateTo);

    if (mode === "archived") {
      data = data.filter((p) => p.status === "validata" || p.status === "rifiutata");
    } else {
      data = data.filter((p) => p.status !== "validata" && p.status !== "rifiutata");
    }

    if (statusFilter) {
      data = data.filter((p) => p.status === statusFilter);
    }

    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((p) =>
      [p.id, p.drug, p.form, p.container, p.executor, p.station, p.status, p.priority,
        p.requestedAt, p.startedAt, p.finishedAt, String(p.errorRate), `${p.dispensed}`, `${p.target}`]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [search, statusFilter, preparations, mode, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id.localeCompare(b.id); break;
        case "status": cmp = statusOrder[a.status] - statusOrder[b.status] || priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case "drug": cmp = a.drug.localeCompare(b.drug); break;
        case "dispensed": cmp = (a.dispensed / a.target) - (b.dispensed / b.target); break;
        case "errorRate": cmp = a.errorRate - b.errorRate; break;
        case "executor": cmp = (a.executor ?? "").localeCompare(b.executor ?? ""); break;
        case "requestedAt": cmp = a.requestedAt.localeCompare(b.requestedAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safeCurrentPage, pageSize]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === paginatedData.length ? new Set() : new Set(paginatedData.map((p) => p.id))
    );
  };

  const progressPercent = (dispensed: number, target: number) =>
    Math.min((dispensed / target) * 100, 100);

  const progressColor = (status: Status, errorRate: number) => {
    if (errorRate > 2) return "bg-status-error";
    if (status === "completata" || status === "validata") return "bg-status-complete";
    if (status === "esecuzione") return "bg-status-waiting";
    return "bg-muted-foreground";
  };

  const thClass = "px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors";

  // ── Empty state ──────────────────────────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">
            {mode === "archived" ? "Nessuna preparazione archiviata" : "Nessuna preparazione da valutare"}
          </p>
          <p className="text-sm text-muted-foreground">
            {search
              ? `Nessun risultato per "${search}"`
              : mode === "archived"
              ? "Le preparazioni validate o rifiutate appariranno qui."
              : "Tutte le preparazioni sono state archiviate o non ne esistono per questa data."}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              Cancella ricerca
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {mode === "active" && (
            <Checkbox
              checked={selected.size === paginatedData.length && paginatedData.length > 0}
              onCheckedChange={toggleAll}
            />
          )}
          <span className="text-sm text-muted-foreground">
            {mode === "active" ? "Seleziona pagina" : "Preparazioni archiviate"} ({paginatedData.length} di {sorted.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mode === "active" && selected.size > 0 && (() => {
            const validatable = [...selected].filter((id) => {
              const p = preparations.find((pr) => pr.id === id);
              return p && p.status !== "attesa" && p.status !== "esecuzione" && p.status !== "validata" && p.status !== "rifiutata";
            });
            return validatable.length > 0 ? (
              <button
                onClick={() => {
                  validatable.forEach((id) => validatePreparation(id));
                  setSelected(new Set());
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-status-complete px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-status-complete/90"
              >
                <Check className="h-3.5 w-3.5" />
                Valida ({validatable.length})
              </button>
            ) : null;
          })()}
          {mode === "active" && selected.size > 0 && (
            <span className="text-sm text-muted-foreground">{selected.size} selezionate</span>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48 bg-secondary pl-8"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {mode === "active" && <th className="w-10 px-5 py-3" />}
              <th className={thClass} onClick={() => toggleSort("status")}>
                <span className="inline-flex items-center gap-1">ID / Stato <SortIcon col="status" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("drug")}>
                <span className="inline-flex items-center gap-1">Richiesta <SortIcon col="drug" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("dispensed")}>
                <span className="inline-flex items-center gap-1">Quantità <SortIcon col="dispensed" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("errorRate")}>
                <span className="inline-flex items-center gap-1">Errore % <SortIcon col="errorRate" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("executor")}>
                <span className="inline-flex items-center gap-1">Postazione <SortIcon col="executor" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("requestedAt")}>
                <span className="inline-flex items-center gap-1">Tempistiche <SortIcon col="requestedAt" /></span>
              </th>
              {mode === "archived" && (
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider">Motivo</th>
              )}
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((p) => {
              const sc = statusConfig[p.status];
              const pc = priorityConfig[p.priority];
              const rejectionReason = mode === "archived" ? getRejectionReason(p.id) : undefined;
              return (
                <tr
                  key={p.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50"
                >
                  {mode === "active" && (
                    <td className="px-5 py-4">
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <p className="font-semibold text-foreground">{p.id}</p>
                    <div className={`flex items-center gap-1 text-xs ${sc.className}`}>
                      {sc.icon}
                      {sc.label}
                    </div>
                    <Badge variant="outline" className={`mt-1 border-0 text-[10px] font-medium ${pc.className}`}>
                      {pc.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{p.drug}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.container}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="mb-1 text-sm font-medium text-foreground">
                      {p.dispensed}ml / {p.target}ml
                    </p>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(p.status, p.errorRate)}`}
                        style={{ width: `${progressPercent(p.dispensed, p.target)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {p.errorRate > 0 ? (
                      <span className={`font-semibold ${p.errorRate > 2 ? "text-status-error" : "text-status-progress"}`}>
                        {p.errorRate}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {p.station ? (
                      <p className="text-sm font-medium text-foreground">{p.station}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Non assegnata</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        <Clock className="mr-1 inline h-3 w-3 text-status-waiting" />
                        Richiesta: {p.requestedAt}
                      </p>
                      {p.startedAt && (
                        <p>
                          <ArrowRight className="mr-1 inline h-3 w-3 text-status-progress" />
                          Inizio: {p.startedAt}
                        </p>
                      )}
                      {p.finishedAt && (
                        <p>
                          <Check className="mr-1 inline h-3 w-3 text-status-complete" />
                          Fine: {p.finishedAt}
                        </p>
                      )}
                      {p.status === "esecuzione" && (
                        <p className="text-status-progress font-medium">In corso...</p>
                      )}
                    </div>
                  </td>
                  {mode === "archived" && (
                    <td className="px-4 py-4">
                      {rejectionReason ? (
                        <Badge variant="outline" className="border-0 bg-status-error-bg text-[10px] font-medium text-status-error">
                          {rejectionReason}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-4">
                    {mode === "active" ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.status !== "attesa" && p.status !== "esecuzione" ? (
                          <>
                            <button
                              onClick={() => validatePreparation(p.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-status-complete-bg px-3 py-1.5 text-xs font-semibold text-status-complete transition-colors hover:bg-status-complete/20"
                              title="Valida preparazione"
                            >
                              <Check className="h-4 w-4" />
                              Valida
                            </button>
                            <button
                              onClick={() => { setRejectTargetIds([p.id]); setRejectDialogOpen(true); }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-status-error-bg px-3 py-1.5 text-xs font-semibold text-status-error transition-colors hover:bg-status-error/20"
                              title="Rifiuta preparazione"
                            >
                              <X className="h-4 w-4" />
                              Rifiuta
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => navigate(`/preparation/${p.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          title="Vedi dettagli"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Dettagli
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => undoPreparation(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-status-progress-bg px-3 py-1.5 text-xs font-semibold text-status-progress transition-colors hover:bg-status-progress/20"
                          title="Annulla validazione o rifiuto e ripristina lo stato precedente"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Annulla
                        </button>
                        <button
                          onClick={() => navigate(`/preparation/${p.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          title="Vedi dettagli"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Dettagli
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Mostrando {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, sorted.length)} di {sorted.length} preparazioni
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={safeCurrentPage <= 1}
            onClick={() => { setCurrentPage((p) => p - 1); setSelected(new Set()); }}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Precedente
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => { setCurrentPage(page); setSelected(new Set()); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                page === safeCurrentPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            disabled={safeCurrentPage >= totalPages}
            onClick={() => { setCurrentPage((p) => p + 1); setSelected(new Set()); }}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Successivo
          </button>
        </div>
      </div>

      <RejectDialog
        open={rejectDialogOpen}
        preparationIds={rejectTargetIds}
        onConfirm={(reason) => {
          rejectTargetIds.forEach((rid) => rejectPreparation(rid, reason));
          setRejectDialogOpen(false);
          setRejectTargetIds([]);
          setSelected(new Set());
        }}
        onCancel={() => { setRejectDialogOpen(false); setRejectTargetIds([]); }}
      />
    </div>
  );
};

export default PreparationsTable;
