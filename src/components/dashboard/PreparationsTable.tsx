import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { extFetch } from "@/lib/apiClient";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Search, PackageOpen, Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type Status, type Priority, type ValidationStatus } from "@/data/preparations";
import { usePreparations, type RejectionReason } from "@/context/PreparationsContext";
import RejectDialog from "./RejectDialog";
import { PreparationRow } from "./PreparationRow";

type SortKey = "id" | "status" | "priority" | "drug" | "dispensed" | "errorRate" | "executor" | "requestedAt";
type SortDir = "asc" | "desc";

const priorityOrder: Record<Priority, number> = { alta: 0, media: 1, bassa: 2 };
const statusOrder: Record<Status, number> = { errore: 0, fallita: 0, attesa: 1, esecuzione: 2, completata: 3, corretta: 4, warning_dosaggio: 5 };

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
  const { preparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation, barcodeSelectedIds, tableSelected: selected, setTableSelected: setSelected } = usePreparations();

  const SS_KEY = `table_state_${mode}`;
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}"); } catch { return {}; } })();

  const [search, setSearch] = useState<string>(saved.search ?? "");
  const [sortKey, setSortKey] = useState<SortKey | null>(saved.sortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(saved.sortDir ?? "asc");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [rejectDefaultReason, setRejectDefaultReason] = useState<RejectionReason | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(saved.currentPage ?? 1);
  const [pageSize, setPageSize] = useState<number>(saved.pageSize ?? 10);
  const [assignmentSteps, setAssignmentSteps] = useState<{ strategy: string; logic_op: string; enabled: boolean }[]>(
    [{ strategy: "urgency", logic_op: "AND", enabled: true }]
  );
  const [drugPriorityRules, setDrugPriorityRules] = useState<{ rule_type: string; value: string; priority: number; enabled: boolean }[]>([]);

  const strategyFetched = useRef(false);
  useEffect(() => {
    if (strategyFetched.current) return;
    strategyFetched.current = true;
    Promise.all([
      extFetch("/config/assignment").then((r) => r.ok ? r.json() : null),
      extFetch("/config/drug-priority-rules").then((r) => r.ok ? r.json() : []),
    ]).then(([steps, rules]) => {
      if (steps?.steps?.length) setAssignmentSteps(steps.steps);
      if (Array.isArray(rules)) setDrugPriorityRules(rules);
    }).catch(() => {});
  }, []);

  const persistState = useCallback(() => {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ search, sortKey, sortDir, currentPage, pageSize }));
  }, [SS_KEY, search, sortKey, sortDir, currentPage, pageSize]);

  useEffect(() => { persistState(); }, [persistState]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
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
      // "errore" e "fallita" sono lo stesso gruppo di errore
      const errorGroup: Status[] = ["errore", "fallita"];
      data = data.filter((p) =>
        errorGroup.includes(statusFilter)
          ? errorGroup.includes(p.status)
          : p.status === statusFilter
      );
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
      const activeSteps = assignmentSteps.filter((s) => s.enabled);
      const drugPriorityStep = activeSteps.find((s) => s.strategy === "drug_priority");
      const otherSteps = activeSteps.filter((s) => s.strategy !== "drug_priority");

      const getDrugRank = (p: typeof filtered[0]): number => {
        const activeRules = drugPriorityRules.filter((r) => r.enabled);
        const matched = activeRules.filter((r) =>
          r.rule_type === "drug"
            ? p.drug?.toLowerCase().includes(r.value.toLowerCase())
            : (p.drugCategory ?? "").toLowerCase().startsWith(r.value.toLowerCase())
        );
        return matched.length > 0 ? Math.min(...matched.map((r) => r.priority)) : 9999;
      };

      return [...filtered].sort((a, b) => {
        // drug_priority applicato sempre come sort primario se lo step è attivo
        if (drugPriorityStep) {
          const rankDiff = getDrugRank(a) - getDrugRank(b);
          if (rankDiff !== 0) return rankDiff;
        }
        // Altri step in ordine configurato (tiebreaker all'interno dello stesso rank)
        for (const step of otherSteps) {
          let cmp = 0;
          switch (step.strategy) {
            case "urgency": cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
            case "lifo":    cmp = parseRequestedAt(b.requestedAt) - parseRequestedAt(a.requestedAt); break;
            case "fifo":
            case "round_robin":
            case "load_balance":
            default:        cmp = parseRequestedAt(a.requestedAt) - parseRequestedAt(b.requestedAt); break;
          }
          if (cmp !== 0) return cmp;
        }
        return 0;
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
  }, [filtered, sortKey, sortDir, assignmentSteps, drugPriorityRules]);

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
            {paginatedData.map((p) => (
              <PreparationRow
                key={p.id}
                p={p}
                mode={mode}
                selected={selected}
                toggleSelect={toggleSelect}
                validatePreparation={validatePreparation}
                undoPreparation={undoPreparation}
                getRejectionReason={getRejectionReason}
                onReject={(id, defaultReason) => {
                  setRejectDefaultReason(defaultReason);
                  setRejectTargetIds([id]);
                  setRejectDialogOpen(true);
                }}
                setSelected={setSelected}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, displayData.length)} di {displayData.length} preparazioni
          </p>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} righe</option>
            ))}
          </select>
        </div>
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
