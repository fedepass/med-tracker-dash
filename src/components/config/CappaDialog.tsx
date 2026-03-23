import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extFetch } from "@/lib/apiClient";
import type { Cappa, Tipologia, RuleType, DrugRule } from "./types";

export interface CappaDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Cappa;
  categories: string[];
  title: string;
}

function DrugRuleRow({ rule, onDelete }: { rule: DrugRule; onDelete: () => void }) {
  const isCategory = !!rule.category;
  const label = isCategory ? rule.category! : rule.drugName!;
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40">
      <div className="flex items-center gap-2">
        <Badge variant={rule.ruleType === "mandatory" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
          {rule.ruleType === "mandatory" ? "Obbligatorio" : "Escluso"}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
          {isCategory ? "Categoria" : "Farmaco"}
        </Badge>
        <span className="text-sm">{label}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function CappaDialog({ open, onClose, onSaved, initial, categories, title }: CappaDialogProps) {
  const [name,        setName]        = useState(initial?.name ?? "");
  const [tipologia,   setTipologia]   = useState<Tipologia>(initial?.tipologia ?? "sterile");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving,      setSaving]      = useState(false);

  const [existingRules,    setExistingRules]    = useState<DrugRule[]>(initial?.drugRules ?? []);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [pendingAdd,       setPendingAdd]       = useState<{ drugName: string | null; category: string | null; ruleType: RuleType }[]>([]);

  const [ruleTarget,   setRuleTarget]   = useState<"drug" | "category">("drug");
  const [ruleType,     setRuleType]     = useState<RuleType>("excluded");
  const [ruleDrugName, setRuleDrugName] = useState("");
  const [ruleCat,      setRuleCat]      = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTipologia(initial?.tipologia ?? "sterile");
      setDescription(initial?.description ?? "");
      setExistingRules(initial?.drugRules ?? []);
      setPendingDeleteIds([]);
      setPendingAdd([]);
      setRuleDrugName("");
      setRuleCat("");
    }
  }, [open, initial]);

  const visibleExisting = existingRules.filter((r) => !pendingDeleteIds.includes(r.id));
  const canAddRule = ruleTarget === "drug" ? !!ruleDrugName.trim() : !!ruleCat.trim();

  const handleAddRule = () => {
    if (!canAddRule) return;
    setPendingAdd((prev) => [...prev, {
      drugName: ruleTarget === "drug" ? ruleDrugName.trim() : null,
      category: ruleTarget === "category" ? ruleCat.trim() : null,
      ruleType,
    }]);
    setRuleDrugName("");
    setRuleCat("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let cappaId: number;
      if (initial) {
        const res = await extFetch(`/config/cappe/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), tipologia, description: description.trim() || null, active: initial.active }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cappaId = initial.id;
      } else {
        const res = await extFetch(`/config/cappe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), tipologia, description: description.trim() || null }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cappaId = (await res.json()).id;
      }
      await Promise.all(pendingDeleteIds.map((id) =>
        extFetch(`/config/drug-rules/${id}`, { method: "DELETE" })
      ));
      await Promise.all(pendingAdd.map((r) =>
        extFetch(`/config/cappe/${cappaId}/drug-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drug_name: r.drugName, category: r.category, rule_type: r.ruleType }),
        })
      ));
      toast.success(initial ? "Cappa aggiornata" : "Cappa creata");
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configura nome, tipologia, descrizione e filtri farmaci della cappa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cappa-name">Nome cappa</Label>
            <Input id="cappa-name" placeholder="Es. Cappa 1, BSC-A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cappa-tipologia">Tipologia</Label>
            <Select value={tipologia} onValueChange={(v) => setTipologia(v as Tipologia)}>
              <SelectTrigger id="cappa-tipologia"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sterile">Sterile</SelectItem>
                <SelectItem value="biologica">Biologica</SelectItem>
                <SelectItem value="chimica">Chimica</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cappa-description">Descrizione <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <textarea
              id="cappa-description"
              placeholder="Es. Cappa a flusso laminare per preparazioni sterili oncologiche..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-sm font-medium">Filtri farmaci / categorie</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              <strong>Obbligatorio</strong>: la cappa accetta SOLO queste voci. <strong>Escluso</strong>: la cappa ignora queste voci.
            </p>

            {(visibleExisting.length > 0 || pendingAdd.length > 0) && (
              <div className="space-y-1.5">
                {visibleExisting.map((rule) => {
                  const isCategory = !!rule.category;
                  return (
                    <div key={rule.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40">
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.ruleType === "mandatory" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                          {rule.ruleType === "mandatory" ? "Obbligatorio" : "Escluso"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {isCategory ? "Categoria" : "Farmaco"}
                        </Badge>
                        <span className="text-sm">{isCategory ? rule.category : rule.drugName}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDeleteIds((prev) => [...prev, rule.id])}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
                {pendingAdd.map((r, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.ruleType === "mandatory" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {r.ruleType === "mandatory" ? "Obbligatorio" : "Escluso"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        {r.category ? "Categoria" : "Farmaco"}
                      </Badge>
                      <span className="text-sm">{r.category ?? r.drugName}</span>
                      <span className="text-[10px] text-primary italic">nuovo</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingAdd((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
              <div className="flex rounded-md border border-border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => { setRuleTarget("drug"); setRuleCat(""); }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium transition-colors",
                    ruleTarget === "drug"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  Farmaco specifico
                </button>
                <button
                  type="button"
                  onClick={() => { setRuleTarget("category"); setRuleDrugName(""); }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium transition-colors border-l border-border",
                    ruleTarget === "category"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  Categoria
                </button>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excluded">Escluso</SelectItem>
                    <SelectItem value="mandatory">Obbligatorio</SelectItem>
                  </SelectContent>
                </Select>

                {ruleTarget === "drug" ? (
                  <Input
                    className="h-8 text-xs flex-1 min-w-[160px]"
                    placeholder="Nome farmaco (es. Vancomicina)..."
                    value={ruleDrugName}
                    onChange={(e) => setRuleDrugName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddRule(); }}
                  />
                ) : (
                  <Select value={ruleCat} onValueChange={setRuleCat}>
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-[160px]">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0
                        ? categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)
                        : <div className="px-3 py-2 text-xs text-muted-foreground italic">Nessuna categoria disponibile</div>
                      }
                    </SelectContent>
                  </Select>
                )}

                <Button type="button" size="sm" className="h-8 px-3 shrink-0" disabled={!canAddRule} onClick={handleAddRule}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Aggiungi
                </Button>
              </div>

              {ruleType === "mandatory" && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                  Obbligatorio: questa cappa accetterà SOLO le preparazioni che corrispondono a questa voce.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Keep DrugRuleRow as named export for CappeTab usage
export { DrugRuleRow };
