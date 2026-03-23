import { useState, useEffect, useCallback } from "react";
import { extFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunctionEntry {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  enabled: boolean;
}

// ── Category helpers ──────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function FunctionsCatalogView({ onBack }: { onBack: () => void }) {
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
