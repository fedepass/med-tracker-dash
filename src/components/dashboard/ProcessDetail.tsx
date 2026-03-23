import { useState, useEffect, useRef } from "react";
import { extFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronUp, ChevronDown, Check, GripVertical } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProcessConfig {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  step_count: number;
}

interface FunctionEntry {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  enabled: boolean;
}

interface Step {
  function_id: number;
  code: string;
  name: string;
  category: string | null;
  description?: string | null;
}

// ── Category helpers ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  farmaco: "Farmaco",
  contenitore: "Contenitore",
  pesata: "Pesata",
  finale: "Finale",
};

function categoryLabel(c: string | null) {
  return c ? (CATEGORY_LABELS[c] ?? c) : "Altro";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProcessDetail({ config, onBack }: { config: ProcessConfig; onBack: () => void }) {
  const [catalog, setCatalog] = useState<FunctionEntry[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    extFetch("/config/functions-catalog")
      .then((r) => r.ok ? r.json() : [])
      .then(setCatalog)
      .catch(() => {});

    extFetch(`/config/process-configs/${config.id}/steps`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) =>
        setSteps(data.map((s) => ({ function_id: s.function_id, code: s.code, name: s.name, category: s.category })))
      )
      .catch(() => {});
  }, [config.id]);

  // Ordine fisso delle categorie
  const CATEGORY_ORDER = ["farmaco", "contenitore", "pesata", "finale"];
  const extraCategories = Array.from(new Set(catalog.map((f) => f.category ?? ""))).filter((c) => c && !CATEGORY_ORDER.includes(c));
  const categories = [...CATEGORY_ORDER, ...extraCategories].filter((c) => catalog.some((f) => f.category === c));
  const selectedIds = new Set(steps.map((s) => s.function_id));

  function toggleFunction(fn: FunctionEntry) {
    if (selectedIds.has(fn.id)) {
      setSteps((prev) => prev.filter((s) => s.function_id !== fn.id));
    } else {
      setSteps((prev) => [...prev, { function_id: fn.id, code: fn.code, name: fn.name, category: fn.category }]);
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setSteps((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(toIdx: number) {
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return; }
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await extFetch(`/config/process-configs/${config.id}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(steps.map((s) => ({ function_id: s.function_id }))),
      });
      if (!res.ok) throw new Error();
      toast.success("Configurazione salvata");
      onBack();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <span className="font-semibold text-foreground">{config.name}</span>
          {config.description && <span className="ml-2 text-sm text-muted-foreground">{config.description}</span>}
        </div>
        <Badge className={config.enabled ? "ml-auto bg-status-complete-bg text-status-complete text-xs" : "ml-auto bg-muted text-muted-foreground text-xs"}>
          {config.enabled ? "Attiva" : "Disattiva"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: catalog */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Funzioni disponibili</h4>
          <p className="text-xs text-muted-foreground -mt-2">Seleziona le funzioni da includere nel processo.</p>

          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {categoryLabel(cat)}
              </p>
              <div className="space-y-1">
                {catalog.filter((f) => (f.category ?? "") === cat).map((fn) => {
                  const isSelected = selectedIds.has(fn.id);
                  return (
                    <button
                      key={fn.id}
                      onClick={() => toggleFunction(fn)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors text-sm ${
                        isSelected
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted/60 text-foreground border border-transparent"
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <span className="flex-1">{fn.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right: ordered steps */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Sequenza di esecuzione</h4>
            <Badge variant="secondary" className="text-xs">{steps.length} funzioni</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Trascina o usa le frecce per riordinare.</p>

          {steps.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground italic">
              Nessuna funzione selezionata.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {steps.map((step, idx) => (
                <li
                  key={step.function_id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors select-none ${
                    dragOverIdx === idx && dragIdx.current !== idx
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/30"
                  }`}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{step.name}</p>
                    <p className="text-[11px] text-muted-foreground">{categoryLabel(step.category)}</p>
                  </div>
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === steps.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>Annulla</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva configurazione"}
        </Button>
      </div>
    </div>
  );
}
