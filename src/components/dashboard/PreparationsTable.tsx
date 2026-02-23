import { useState, useMemo } from "react";
import { CheckCircle2, Loader, AlertTriangle, Clock, Check, X, ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Status = "completata" | "esecuzione" | "errore" | "attesa";
type Priority = "alta" | "media" | "bassa";

interface Preparation {
  id: string;
  status: Status;
  priority: Priority;
  drug: string;
  form: string;
  container: string;
  dispensed: number;
  target: number;
  errorRate: number;
  executor: string | null;
  executorInitials: string | null;
  station: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

const preparations: Preparation[] = [
  { id: "RX-2847", status: "completata", priority: "alta", drug: "Paracetamolo 500mg", form: "Capsula", container: "Contenitore B12", dispensed: 45.2, target: 45.0, errorRate: 0.4, executor: "L. Bianchi", executorInitials: "LB", station: "Post. 1", requestedAt: "08:30", startedAt: "08:45", finishedAt: "09:12" },
  { id: "RX-2846", status: "esecuzione", priority: "media", drug: "Ibuprofene 400mg", form: "Compressa", container: "Contenitore A5", dispensed: 28.5, target: 30.0, errorRate: 0, executor: "M. Verdi", executorInitials: "MV", station: "Post. 2", requestedAt: "09:15", startedAt: "09:30", finishedAt: null },
  { id: "RX-2845", status: "errore", priority: "alta", drug: "Amoxicillina 875mg", form: "Capsula", container: "Contenitore C3", dispensed: 52.8, target: 50.0, errorRate: 5.6, executor: "G. Neri", executorInitials: "GN", station: "Post. 3", requestedAt: "08:00", startedAt: "08:20", finishedAt: "08:45" },
  { id: "RX-2844", status: "attesa", priority: "bassa", drug: "Omeprazolo 20mg", form: "Capsula", container: "Contenitore D7", dispensed: 0, target: 35.0, errorRate: 0, executor: null, executorInitials: null, station: null, requestedAt: "10:00", startedAt: null, finishedAt: null },
  { id: "RX-2843", status: "completata", priority: "media", drug: "Metformina 850mg", form: "Compressa", container: "Contenitore E2", dispensed: 42.5, target: 42.5, errorRate: 0.0, executor: "L. Bianchi", executorInitials: "LB", station: "Post. 1", requestedAt: "07:45", startedAt: "08:00", finishedAt: "08:28" },
];

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string }> = {
  completata: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Completata", className: "text-status-complete" },
  esecuzione: { icon: <Loader className="h-4 w-4" />, label: "In esecuzione", className: "text-status-progress" },
  errore: { icon: <AlertTriangle className="h-4 w-4" />, label: "Errore", className: "text-status-error" },
  attesa: { icon: <Clock className="h-4 w-4" />, label: "Da eseguire", className: "text-status-waiting" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Priorità Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Priorità Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Priorità Bassa", className: "bg-status-complete-bg text-status-complete" },
};

type SortKey = "id" | "status" | "drug" | "dispensed" | "errorRate" | "executor" | "requestedAt";
type SortDir = "asc" | "desc";

const priorityOrder: Record<Priority, number> = { alta: 0, media: 1, bassa: 2 };
const statusOrder: Record<Status, number> = { errore: 0, attesa: 1, esecuzione: 2, completata: 3 };

const PreparationsTable = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    if (!search.trim()) return preparations;
    const q = search.toLowerCase();
    return preparations.filter((p) =>
      [p.id, p.drug, p.form, p.container, p.executor, p.station, p.status, p.priority, p.requestedAt, p.startedAt, p.finishedAt, String(p.errorRate), `${p.dispensed}`, `${p.target}`]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [search]);

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((p) => p.id))));
  };

  const progressPercent = (dispensed: number, target: number) => Math.min((dispensed / target) * 100, 100);

  const progressColor = (status: Status, errorRate: number) => {
    if (errorRate > 2) return "bg-status-error";
    if (status === "completata") return "bg-status-complete";
    if (status === "esecuzione") return "bg-status-waiting";
    return "bg-muted-foreground";
  };

  const thClass = "px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header with search */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selected.size === sorted.length && sorted.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            Seleziona tutto ({sorted.length} preparazioni)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.size} selezionate</span>
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
              <th className="w-10 px-5 py-3" />
              <th className={thClass} onClick={() => toggleSort("status")}>
                <span className="inline-flex items-center gap-1">ID / Stato <SortIcon col="status" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("drug")}>
                <span className="inline-flex items-center gap-1">Farmaco <SortIcon col="drug" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("dispensed")}>
                <span className="inline-flex items-center gap-1">Quantità <SortIcon col="dispensed" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("errorRate")}>
                <span className="inline-flex items-center gap-1">Errore % <SortIcon col="errorRate" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("executor")}>
                <span className="inline-flex items-center gap-1">Esecutore <SortIcon col="executor" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("requestedAt")}>
                <span className="inline-flex items-center gap-1">Tempistiche <SortIcon col="requestedAt" /></span>
              </th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const sc = statusConfig[p.status];
              const pc = priorityConfig[p.priority];
              return (
                <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50">
                  <td className="px-5 py-4">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                  </td>
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
                    <p className="text-xs text-muted-foreground">{p.form} · {p.container}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="mb-1 text-sm font-medium text-foreground">
                      {p.dispensed}g / {p.target}g
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
                    {p.executor ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">
                            {p.executorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.station}</p>
                          <p className="text-xs text-muted-foreground">{p.executor}</p>
                        </div>
                      </div>
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
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button className="rounded-md p-1.5 text-status-complete transition-colors hover:bg-status-complete-bg" title="Valida">
                        <Check className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-status-error transition-colors hover:bg-status-error-bg" title="Rifiuta">
                        <X className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-status-waiting transition-colors hover:bg-status-waiting-bg" title="Dettagli">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">Mostrando {sorted.length} di 32 preparazioni</p>
        <div className="flex items-center gap-1">
          <button className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary">Precedente</button>
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">1</button>
          <button className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary">2</button>
          <button className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary">3</button>
          <button className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary">Successivo</button>
        </div>
      </div>
    </div>
  );
};

export default PreparationsTable;
