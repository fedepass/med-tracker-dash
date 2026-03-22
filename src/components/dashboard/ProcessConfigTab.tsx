import { useState, useEffect, useCallback, useRef } from "react";
import { extFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, ArrowLeft, ChevronUp, ChevronDown,
  Check, GripVertical, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

// ── Category label ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  farmaco: "Farmaco",
  contenitore: "Contenitore",
  pesata: "Pesata",
  finale: "Finale",
};

const CATEGORY_OPTIONS = ["farmaco", "contenitore", "pesata", "finale"];

function categoryLabel(c: string | null) {
  return c ? (CATEGORY_LABELS[c] ?? c) : "Altro";
}

// ── Process list ───────────────────────────────────────────────────────────────

export default function ProcessConfigTab() {
  const [configs, setConfigs] = useState<ProcessConfig[]>([]);
  const [selected, setSelected] = useState<ProcessConfig | null>(null);
  const [showFunctions, setShowFunctions] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProcessConfig | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    extFetch("/config/process-configs")
      .then((r) => r.ok ? r.json() : [])
      .then(setConfigs)
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setFormName(""); setFormDesc(""); setFormEnabled(true);
    setDialogOpen(true);
  }

  function openEdit(cfg: ProcessConfig, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(cfg);
    setFormName(cfg.name); setFormDesc(cfg.description ?? ""); setFormEnabled(cfg.enabled);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body = { name: formName.trim(), description: formDesc.trim() || null, enabled: formEnabled };
      if (editTarget) {
        await extFetch(`/config/process-configs/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        toast.success("Configurazione aggiornata");
      } else {
        await extFetch("/config/process-configs", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        toast.success("Configurazione creata");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cfg: ProcessConfig, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Eliminare la configurazione "${cfg.name}"?`)) return;
    await extFetch(`/config/process-configs/${cfg.id}`, { method: "DELETE" });
    toast.success("Eliminata");
    load();
  }

  if (selected) {
    return (
      <ProcessDetail
        config={selected}
        onBack={() => { setSelected(null); load(); }}
      />
    );
  }

  if (showFunctions) {
    return <FunctionsCatalogView onBack={() => setShowFunctions(false)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Configurazioni Processo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Definisci quali funzioni eseguire (e in quale ordine) per ogni tipo di processo di preparazione.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowFunctions(true)}>
            <GripVertical className="h-4 w-4" /> Catalogo funzioni
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuova configurazione
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Descrizione</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Funzioni</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Stato</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground italic">Nessuna configurazione presente.</td></tr>
            )}
            {configs.map((cfg) => (
              <tr
                key={cfg.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">{cfg.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{cfg.description ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary" className="text-xs">{cfg.step_count}</Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cfg.enabled ? "bg-status-complete-bg text-status-complete text-xs" : "bg-muted text-muted-foreground text-xs"}>
                    {cfg.enabled ? "Attiva" : "Disattiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setSelected(cfg)}>
                      <GripVertical className="h-3.5 w-3.5" /> Funzioni
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(cfg, e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => handleDelete(cfg, e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifica configurazione" : "Nuova configurazione"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="es. standard, oncologia..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descrizione opzionale" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} className="rounded" />
              <span className="text-sm">Configurazione attiva</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Functions catalog management ───────────────────────────────────────────────

function FunctionsCatalogView({ onBack }: { onBack: () => void }) {
  const [functions, setFunctions] = useState<FunctionEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FunctionEntry | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("farmaco");
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    extFetch("/config/functions-catalog")
      .then((r) => r.ok ? r.json() : [])
      .then(setFunctions)
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setFormCode(""); setFormName(""); setFormDesc("");
    setFormCategory("farmaco"); setFormEnabled(true);
    setDialogOpen(true);
  }

  function openEdit(fn: FunctionEntry, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(fn);
    setFormCode(fn.code); setFormName(fn.name);
    setFormDesc(fn.description ?? ""); setFormCategory(fn.category ?? "farmaco");
    setFormEnabled(fn.enabled);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formCode.trim() || !formName.trim()) return;
    setSaving(true);
    try {
      const body = { code: formCode, name: formName, description: formDesc || null, category: formCategory, enabled: formEnabled };
      if (editTarget) {
        await extFetch(`/config/functions-catalog/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        toast.success("Funzione aggiornata");
      } else {
        await extFetch("/config/functions-catalog", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        toast.success("Funzione creata");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(fn: FunctionEntry, e: React.MouseEvent) {
    e.stopPropagation();
    await extFetch(`/config/functions-catalog/${fn.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !fn.enabled }),
    });
    load();
  }

  async function handleDelete(fn: FunctionEntry, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Eliminare la funzione "${fn.name}"?`)) return;
    await extFetch(`/config/functions-catalog/${fn.id}`, { method: "DELETE" });
    toast.success("Funzione eliminata");
    load();
  }

  const cats = CATEGORY_OPTIONS.filter((c) => functions.some((f) => f.category === c));
  const extraCats = Array.from(new Set(functions.map((f) => f.category ?? "").filter((c) => c && !CATEGORY_OPTIONS.includes(c))));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-base font-semibold text-foreground">Catalogo funzioni</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{functions.length} funzioni disponibili</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuova funzione
        </Button>
      </div>

      {/* Function tables by category */}
      {[...cats, ...extraCats].length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-8">Nessuna funzione presente.</p>
      )}
      {[...cats, ...extraCats].map((cat) => (
        <div key={cat}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            {categoryLabel(cat)}
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {functions.filter((f) => (f.category ?? "") === cat).map((fn) => (
                  <tr key={fn.id} className={`transition-colors ${fn.enabled ? "hover:bg-muted/20" : "opacity-50 hover:bg-muted/20"}`}>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground w-48">{fn.code}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{fn.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fn.description ?? "—"}</td>
                    <td className="px-3 py-2 w-28 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleToggle(fn, e)}
                          title={fn.enabled ? "Disabilita" : "Abilita"}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {fn.enabled
                            ? <ToggleRight className="h-4 w-4 text-primary" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={(e) => openEdit(fn, e)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => handleDelete(fn, e)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifica funzione" : "Nuova funzione"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Codice *</label>
                <Input className="font-mono text-xs h-8" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="DRUG_PHOTO" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
              <Input className="h-8 text-sm" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Acquisizione foto farmaco" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
              <Input className="h-8 text-sm" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Opzionale" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} />
              <span className="text-sm">Funzione abilitata</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={!formCode.trim() || !formName.trim() || saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Process detail ─────────────────────────────────────────────────────────────

function ProcessDetail({ config, onBack }: { config: ProcessConfig; onBack: () => void }) {
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
