import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { extFetch } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Loader, AlertTriangle, Clock, Check, X, ArrowRight,
  ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldCheck, ShieldX, PackageOpen, RotateCcw,
  LinkIcon, Unlink,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Status, type Priority, type ValidationStatus } from "@/data/preparations";
import { usePreparations, type RejectionReason } from "@/context/PreparationsContext";
import RejectDialog from "./RejectDialog";

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string }> = {
  completata: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Completata", className: "text-status-complete" },
  esecuzione: { icon: <Loader className="h-4 w-4" />, label: "In esecuzione", className: "text-status-progress" },
  errore: { icon: <AlertTriangle className="h-4 w-4" />, label: "Errore", className: "text-status-error" },
  attesa: { icon: <Clock className="h-4 w-4" />, label: "Da eseguire", className: "text-status-waiting" },
};

const validationConfig: Record<NonNullable<ValidationStatus>, { icon: React.ReactNode; label: string; className: string }> = {
  validata: { icon: <ShieldCheck className="h-4 w-4" />, label: "Validata", className: "text-status-complete" },
  rifiutata: { icon: <ShieldX className="h-4 w-4" />, label: "Rifiutata", className: "text-status-error" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Bassa", className: "bg-status-complete-bg text-status-complete" },
};

type SortKey = "id" | "status" | "priority" | "drug" | "dispensed" | "errorRate" | "executor" | "requestedAt";
type SortDir = "asc" | "desc";

const priorityOrder: Record<Priority, number> = { alta: 0, media: 1, bassa: 2 };
const statusOrder: Record<Status, number> = { errore: 0, attesa: 1, esecuzione: 2, completata: 3 };

// requestedAt is formatted as "dd/mm/yyyy HH:MM" — parse to epoch for correct chronological comparison
function parseRequestedAt(s: string | null): number {
  if (!s) return 0;
  const [datePart, timePart] = s.split(" ");
  const [d, m, y] = datePart.split("/");
  return new Date(`${y}-${m}-${d}T${timePart ?? "00:00"}:00`).getTime();
}

interface PreparationsTableProps {
  mode: "active" | "archived";
  statusFilter?: Status | null;
  validationFilter?: ValidationStatus;
  dateFrom?: string;
  dateTo?: string;
}

const PreparationsTable = ({ mode, statusFilter, validationFilter, dateFrom, dateTo }: PreparationsTableProps) => {
  const navigate = useNavigate();
  const { preparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation, reassignCappa, cappe, barcodeSelectedIds, tableSelected: selected, setTableSelected: setSelected } = usePreparations();

  const SS_KEY = `table_state_${mode}`;
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}"); } catch { return {}; } })();

  const [search, setSearch] = useState<string>(saved.search ?? "");
  const [sortKey, setSortKey] = useState<SortKey | null>(saved.sortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(saved.sortDir ?? "asc");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [rejectDefaultReason, setRejectDefaultReason] = useState<import("@/context/PreparationsContext").RejectionReason | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(saved.currentPage ?? 1);
  const [assignmentStrategy, setAssignmentStrategy] = useState<string>("urgency");
  const pageSize = 10;

  const strategyFetched = useRef(false);
  useEffect(() => {
    if (strategyFetched.current) return;
    strategyFetched.current = true;
    extFetch("/config/assignment")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.strategy) setAssignmentStrategy(d.strategy); })
      .catch(() => {});
  }, []);

  const persistState = useCallback(() => {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ search, sortKey, sortDir, currentPage }));
  }, [SS_KEY, search, sortKey, sortDir, currentPage]);

  useEffect(() => { persistState(); }, [persistState]);

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
      data = data.filter((p) => p.validationStatus !== null);
      if (validationFilter) data = data.filter((p) => p.validationStatus === validationFilter);
    } else {
      data = data.filter((p) => p.validationStatus === null);
    }

    if (statusFilter) {
      data = data.filter((p) => p.status === statusFilter);
    }

    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((p) =>
      [p.id, p.drug, p.form, p.executor, p.station, p.status, p.priority,
        p.requestedAt, p.startedAt, p.finishedAt, String(p.errorRate), `${p.dispensed}`]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [search, statusFilter, validationFilter, preparations, mode, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    if (!sortKey) {
      // Default order driven by assignment strategy
      return [...filtered].sort((a, b) => {
        switch (assignmentStrategy) {
          case "urgency":
            return priorityOrder[a.priority] - priorityOrder[b.priority]
              || parseRequestedAt(a.requestedAt) - parseRequestedAt(b.requestedAt);
          case "lifo":
            return parseRequestedAt(b.requestedAt) - parseRequestedAt(a.requestedAt);
          case "fifo":
          case "round_robin":
          case "load_balance":
          default:
            return parseRequestedAt(a.requestedAt) - parseRequestedAt(b.requestedAt);
        }
      });
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id.localeCompare(b.id); break;
        case "status": cmp = statusOrder[a.status] - statusOrder[b.status] || priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case "priority": cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case "drug": cmp = a.drug.localeCompare(b.drug); break;
        case "dispensed": cmp = a.dispensed - b.dispensed; break;
        case "errorRate": cmp = a.errorRate - b.errorRate; break;
        case "executor": cmp = (a.executor ?? "").localeCompare(b.executor ?? ""); break;
        case "requestedAt": cmp = parseRequestedAt(a.requestedAt) - parseRequestedAt(b.requestedAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, assignmentStrategy]);

  // Pin all selected rows at top (barcode or manual), only in active mode
  const pinnedIds = mode === "active" ? sorted.filter((p) => selected.has(p.id)).map((p) => p.id) : [];
  const displayData = useMemo(() => {
    if (pinnedIds.length === 0) return sorted;
    const pinned = pinnedIds.map((id) => sorted.find((p) => p.id === id)!);
    const rest = sorted.filter((p) => !pinnedIds.includes(p.id));
    return [...pinned, ...rest];
  }, [sorted, pinnedIds]);

  const totalPages = Math.max(1, Math.ceil(displayData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayData.slice(start, start + pageSize);
  }, [displayData, safeCurrentPage, pageSize]);


  const toggleSelect = (id: string) => {
    const prep = preparations.find((p) => p.id === id);
    if (prep?.validationStatus !== null && prep?.validationStatus !== undefined) return;
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
    if (errorRate > 10) return "bg-status-error";
    if (errorRate > 5) return "bg-amber-500";
    if (status === "completata") return "bg-status-complete";
    if (status === "esecuzione") return "bg-status-waiting";
    return "bg-muted-foreground";
  };

  const thClass = "px-3 py-1.5 cursor-pointer select-none hover:text-foreground transition-colors";

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
            {mode === "active" ? "Seleziona pagina" : "Preparazioni archiviate"} ({paginatedData.length} di {displayData.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mode === "active" && selected.size > 0 && (() => {
            const validatable = [...selected].filter((id) => {
              const p = preparations.find((pr) => pr.id === id);
              return p && p.status !== "attesa" && p.status !== "esecuzione" && p.validationStatus === null;
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
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {mode === "active" && <th className="w-10 px-3 py-1.5" />}
              <th className={thClass} onClick={() => toggleSort("status")}>
                <span className="inline-flex items-center gap-1">ID / Stato <SortIcon col="status" /></span>
              </th>
              <th className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Validazione</th>
              <th className={thClass} onClick={() => toggleSort("priority")}>
                <span className="inline-flex items-center gap-1">Priorità <SortIcon col="priority" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("drug")}>
                <span className="inline-flex items-center gap-1">Richiesta <SortIcon col="drug" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("dispensed")}>
                <span className="inline-flex items-center gap-1">Contenitore <SortIcon col="dispensed" /></span>
              </th>
              <th className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Dosato
              </th>
              <th className={thClass} onClick={() => toggleSort("errorRate")}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">Err % <SortIcon col="errorRate" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("executor")}>
                <span className="inline-flex items-center gap-1">Postazione <SortIcon col="executor" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("requestedAt")}>
                <span className="inline-flex items-center gap-1">Tempistiche <SortIcon col="requestedAt" /></span>
              </th>
              {mode === "archived" && (
                <th className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider">Motivo</th>
              )}
              <th className="px-3 py-1.5">Azioni</th>
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
                  onClick={() => mode === "active" && toggleSelect(p.id)}
                  className={`border-b border-border transition-colors last:border-0 hover:bg-secondary/50 ${mode === "active" ? "cursor-pointer" : ""} ${selected.has(p.id) ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  {mode === "active" && (
                    <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    </td>
                  )}
                  <td className="px-3 py-1.5">
                    <p className="font-semibold text-foreground">{p.id}</p>
                    <div className={`flex items-center gap-1 text-xs ${sc.className}`}>
                      {sc.icon}
                      {sc.label}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    {p.validationStatus ? (
                      <div className={`flex items-center gap-1 text-xs ${validationConfig[p.validationStatus].className}`}>
                        {validationConfig[p.validationStatus].icon}
                        {validationConfig[p.validationStatus].label}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant="outline" className={`border-0 text-[10px] font-medium ${pc.className}`}>
                      {pc.label}
                    </Badge>
                  </td>
                  <td className={`px-3 py-1.5 ${p.drugCatalogId == null ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                    <p className="font-medium text-foreground">{p.drug}</p>
                    {p.labelData.dosage && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.labelData.dosage}</p>
                    )}
                    {p.drugCatalogId != null ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <LinkIcon className="h-2.5 w-2.5" />{p.drugCatalogName ?? "catalogo"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                        <Unlink className="h-2.5 w-2.5" />no catalogo
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-1.5 ${p.containerCatalogId == null ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                    {p.labelData.solvent ? (
                      <p className="text-sm font-medium text-foreground">{p.labelData.solvent}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">—</p>
                    )}
                    {p.labelData.volume ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.labelData.volume}</p>
                    ) : p.volumeValue != null ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.volumeValue} ml</p>
                    ) : null}
                    {p.containerCatalogId != null ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <LinkIcon className="h-2.5 w-2.5" />{p.containerCatalogName ?? "catalogo"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                        <Unlink className="h-2.5 w-2.5" />no catalogo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {p.dispensed > 0 ? (() => {
                      const sg = p.specificGravity;
                      const unit = p.dosageUnit?.toLowerCase() ?? "";
                      let displayValue: string;
                      let displayUnit: string;
                      if (sg != null && unit && !["ml", "l"].includes(unit)) {
                        const grams = p.dispensed * sg;
                        if (unit === "mcg" || unit === "μg") {
                          displayValue = (grams * 1_000_000).toFixed(0);
                          displayUnit = "mcg";
                        } else if (unit === "mg") {
                          displayValue = (grams * 1_000).toFixed(1);
                          displayUnit = "mg";
                        } else {
                          displayValue = grams.toFixed(3);
                          displayUnit = "g";
                        }
                      } else {
                        displayValue = p.dispensed.toFixed(2);
                        displayUnit = p.dosageUnit ?? "ml";
                      }
                      return (
                        <>
                          <p className="text-sm font-medium text-foreground">
                            {displayValue} {displayUnit}
                          </p>
                          {p.dosageValue != null && p.dosageUnit && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              richiesti {p.dosageValue} {p.dosageUnit}
                            </p>
                          )}
                        </>
                      );
                    })() : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {p.errorRate > 0 ? (
                      <span className={`font-semibold ${
                        p.errorRate <= 5 ? "text-green-600" :
                        p.errorRate <= 10 ? "text-amber-500" :
                        "text-status-error"
                      }`}>
                        {p.errorRate}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    {mode === "active" && p.status === "attesa" && cappe.length > 0 ? (
                      <Select
                        value={p.cappaId != null ? String(p.cappaId) : "__none__"}
                        onValueChange={(val) => {
                          const id = val === "__none__" ? null : Number(val);
                          const name = id != null ? (cappe.find((c) => c.id === id)?.name ?? null) : null;
                          reassignCappa(p.id, id, name);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-36 border-dashed">
                          <SelectValue placeholder="Non assegnata" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground italic">Non assegnata</span>
                          </SelectItem>
                          {cappe.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={p.station ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground italic"}>
                        {p.station ?? "Non assegnata"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
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
                    <td className="px-3 py-1.5">
                      {rejectionReason ? (
                        <Badge variant="outline" className="border-0 bg-status-error-bg text-[10px] font-medium text-status-error">
                          {rejectionReason}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    {mode === "active" ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.status !== "attesa" && p.status !== "esecuzione" && p.validationStatus === null ? (
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
                              onClick={() => {
                                const def = p.status === "errore" && p.volumeValue != null && p.dispensed > p.volumeValue ? "Sovradosaggio" : p.status === "errore" && p.volumeValue != null && p.dispensed < p.volumeValue && p.dispensed > 0 ? "Sottodosaggio" : undefined;
                                setRejectDefaultReason(def);
                                setRejectTargetIds([p.id]);
                                setRejectDialogOpen(true);
                              }}
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
          Mostrando {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, displayData.length)} di {displayData.length} preparazioni
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Precedente
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
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
            onClick={() => setCurrentPage((p) => p + 1)}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Successivo
          </button>
        </div>
      </div>

      <RejectDialog
        open={rejectDialogOpen}
        preparationIds={rejectTargetIds}
        defaultReason={rejectDefaultReason}
        onConfirm={(reason) => {
          rejectTargetIds.forEach((rid) => rejectPreparation(rid, reason));
          setRejectDialogOpen(false);
          setRejectTargetIds([]);
          setRejectDefaultReason(undefined);
          setSelected(new Set());
        }}
        onCancel={() => { setRejectDialogOpen(false); setRejectTargetIds([]); setRejectDefaultReason(undefined); }}
      />
    </div>
  );
};

export default PreparationsTable;
