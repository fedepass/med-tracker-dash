import { useState, useEffect, useCallback } from "react";
import { extFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import FunctionsCatalogView from "@/components/dashboard/FunctionsCatalogView";
import ProcessDetail from "@/components/dashboard/ProcessDetail";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProcessConfig {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  step_count: number;
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
