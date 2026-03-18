import { useState, useEffect, useCallback } from "react";
import { Settings, Plus, Trash2, Edit2, Check, X, ShieldCheck, Zap, Clock, RefreshCw, Scale, Pill, Search } from "lucide-react";
import Navbar from "@/components/dashboard/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import ProcessConfigTab from "@/components/dashboard/ProcessConfigTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tipologia = "biologica" | "chimica" | "sterile" | "custom";
type RuleType = "excluded" | "mandatory";
type AssignmentStrategy = "fifo" | "lifo" | "urgency" | "round_robin" | "load_balance";

interface DrugRule {
  id: number;
  cappaId: number;
  drugName: string | null;
  category: string | null;
  ruleType: RuleType;
}

interface Cappa {
  id: number;
  name: string;
  tipologia: Tipologia;
  description: string | null;
  active: boolean;
  drugRules: DrugRule[];
}

interface Drug {
  id: number;
  name: string;
  code: string | null;
  aic_code: string | null;
  category: string | null;
  is_powder: boolean;
  diluent: string | null;
  reconstitution_volume: number | null;
  reconstitution_volume_unit: string | null;
  specific_gravity: number | null;
  vial_volume: number | null;
  needs_review: boolean;
}

// ─── Strategy definitions ──────────────────────────────────────────────────────

const STRATEGIES: { value: AssignmentStrategy; label: string; description: string; Icon: React.FC<{ className?: string }> }[] = [
  {
    value: "urgency",
    label: "Urgenza",
    description: "STAT → URGENT → ROUTINE. Le prescrizioni più urgenti vengono assegnate per prime.",
    Icon: ({ className }) => <Zap className={className} />,
  },
  {
    value: "fifo",
    label: "FIFO",
    description: "First In First Out. Le prescrizioni vengono elaborate nell'ordine di arrivo.",
    Icon: ({ className }) => <Clock className={className} />,
  },
  {
    value: "lifo",
    label: "LIFO",
    description: "Last In First Out. Le prescrizioni più recenti vengono elaborate per prime.",
    Icon: ({ className }) => <RefreshCw className={className} />,
  },
  {
    value: "round_robin",
    label: "Round-Robin",
    description: "Distribuzione ciclica equa tra tutte le cappe disponibili.",
    Icon: ({ className }) => <RefreshCw className={className} />,
  },
  {
    value: "load_balance",
    label: "Bilanciamento carico",
    description: "Assegna alla cappa con meno preparazioni in stato 'attesa' o 'esecuzione'.",
    Icon: ({ className }) => <Scale className={className} />,
  },
];

// ─── Cappa Dialog ─────────────────────────────────────────────────────────────

interface CappaDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Cappa;
  categories: string[];
  title: string;
}

function CappaDialog({ open, onClose, onSaved, initial, categories, title }: CappaDialogProps) {
  const [name,        setName]        = useState(initial?.name ?? "");
  const [tipologia,   setTipologia]   = useState<Tipologia>(initial?.tipologia ?? "sterile");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving,      setSaving]      = useState(false);

  // Regole: esistenti (visibili) + pending eliminazione + pending aggiunta
  const [existingRules,    setExistingRules]    = useState<DrugRule[]>(initial?.drugRules ?? []);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [pendingAdd,       setPendingAdd]       = useState<{ drugName: string | null; category: string | null; ruleType: RuleType }[]>([]);

  // Form nuova regola
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
      // Elimina regole rimosse
      await Promise.all(pendingDeleteIds.map((id) =>
        extFetch(`/config/drug-rules/${id}`, { method: "DELETE" })
      ));
      // Aggiungi nuove regole
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
          {/* Dati base */}
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

          {/* Filtri farmaci */}
          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-sm font-medium">Filtri farmaci / categorie</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              <strong>Obbligatorio</strong>: la cappa accetta SOLO queste voci. <strong>Escluso</strong>: la cappa ignora queste voci.
            </p>

            {/* Regole esistenti + pending aggiunta */}
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

            {/* Form aggiunta */}
            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
              {/* Toggle Farmaco / Categoria */}
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

              {/* Tipo regola + valore + aggiungi */}
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

// ─── Drug Rule Row ─────────────────────────────────────────────────────────────

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

// ─── Cappa Card ────────────────────────────────────────────────────────────────

function CappaCard({
  cappa,
  onEdit,
  onDelete,
  onToggleActive,
  onDeleteDrugRule,
}: {
  cappa: Cappa;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDeleteDrugRule: (ruleId: number) => void;
}) {

  const tipologiaBadge: Record<Tipologia, string> = {
    sterile:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    biologica: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    chimica:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    custom:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <Card className={cn("transition-opacity", !cappa.active && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{cappa.name}</CardTitle>
              <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-md capitalize", tipologiaBadge[cappa.tipologia])}>
                {cappa.tipologia}
              </span>
              {!cappa.active && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Disabilitata
                </span>
              )}
            </div>
            {cappa.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{cappa.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Modifica">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", cappa.active ? "text-muted-foreground hover:text-destructive" : "text-green-600 hover:text-green-700")}
              onClick={onToggleActive}
              title={cappa.active ? "Disabilita" : "Abilita"}
            >
              {cappa.active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Elimina"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {cappa.drugRules.length > 0 && (
        <CardContent className="pt-0 space-y-1.5">
          {cappa.drugRules.map((rule) => (
            <DrugRuleRow key={rule.id} rule={rule} onDelete={() => onDeleteDrugRule(rule.id)} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Drug Dialog ──────────────────────────────────────────────────────────────

interface LookupResult { name: string; code: string | null; aic_code?: string | null; category: string | null; description?: string | null; company?: string | null; source?: string }

interface AicPresentation {
  codice_aic: string;
  denominazione: string;
  descrizione: string;
  ragione_sociale: string;
  dosaggio_valore: number | null;
  dosaggio_unita: string | null;
  volume_soluzione_ml: number | null;
  concentrazione: string | null;
  forma_farmaceutica: string | null;
  forma_breve: string | null;
  via_somministrazione: string | null;
  is_polvere: boolean;
  volume_solvente_ml: number | null;
  quantita_confezione: number | null;
  unita_confezione: string | null;
}

interface DrugDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Drug, "id">) => void;
  initial?: Drug;
  categories: string[];
  title: string;
}

function DrugDialog({ open, onClose, onSave, initial, categories, title }: DrugDialogProps) {
  const [name,                    setName]                    = useState(initial?.name ?? "");
  const [code,                    setCode]                    = useState(initial?.code ?? "");
  const [aicCode,                 setAicCode]                 = useState(initial?.aic_code ?? "");
  const [category,                setCategory]                = useState(initial?.category ?? "");
  const [isPowder,                setIsPowder]                = useState(initial?.is_powder ?? false);
  const [diluent,                 setDiluent]                 = useState(initial?.diluent ?? "");
  const [reconVolume,             setReconVolume]             = useState(initial?.reconstitution_volume?.toString() ?? "");
  const [reconVolumeUnit,         setReconVolumeUnit]         = useState(initial?.reconstitution_volume_unit ?? "ml");
  const [specificGravity,         setSpecificGravity]         = useState(initial?.specific_gravity?.toString() ?? "");
  const [vialVolume,              setVialVolume]              = useState(initial?.vial_volume?.toString() ?? "");
  const [lookupLoading,           setLookupLoading]           = useState(false);
  const [lookupResults,           setLookupResults]           = useState<LookupResult[]>([]);
  const [lookupError,             setLookupError]             = useState<string | null>(null);
  const [catMode,                 setCatMode]                 = useState<"select" | "new">("select");
  const [aicPresentations,        setAicPresentations]        = useState<AicPresentation[]>([]);
  const [aicPresLoading,          setAicPresLoading]          = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setAicCode(initial?.aic_code ?? "");
      const initCat = initial?.category ?? "";
      setCategory(initCat);
      setIsPowder(initial?.is_powder ?? false);
      setDiluent(initial?.diluent ?? "");
      setReconVolume(initial?.reconstitution_volume?.toString() ?? "");
      setReconVolumeUnit(initial?.reconstitution_volume_unit ?? "ml");
      setSpecificGravity(initial?.specific_gravity?.toString() ?? "");
      setVialVolume(initial?.vial_volume?.toString() ?? "");
      setLookupResults([]);
      setLookupError(null);
      setAicPresentations([]);
      setCatMode(initCat && !categories.includes(initCat) ? "new" : "select");
    }
  }, [open, initial]);

  // Debounced AIC presentations fetch — si attiva al cambio del nome
  useEffect(() => {
    if (!open || name.trim().length < 3) { setAicPresentations([]); return; }
    const timer = setTimeout(async () => {
      setAicPresLoading(true);
      try {
        const res = await extFetch(`/config/drug-lookup/aic-presentations?q=${encodeURIComponent(name.trim())}`);
        if (res.ok) setAicPresentations(await res.json());
      } catch { /* silenzioso */ } finally {
        setAicPresLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, open]);

  const handleLookup = async () => {
    if (!name.trim()) return;
    setLookupLoading(true);
    setLookupResults([]);
    setLookupError(null);
    try {
      const res = await extFetch(`/config/drug-lookup?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setLookupResults(data);
      if (!data.length) setLookupError("Nessun risultato trovato");
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Errore nella ricerca");
    } finally {
      setLookupLoading(false);
    }
  };

  const applyResult = (r: LookupResult) => {
    setName(r.name);
    setCode(r.code ?? "");
    if (r.aic_code) setAicCode(r.aic_code);
    const cat = r.category ?? "";
    setCategory(cat);
    if (cat && !categories.includes(cat)) setCatMode("new");
    else setCatMode("select");
    setLookupResults([]);
  };

  const applyPresentation = (p: AicPresentation) => {
    setAicCode(p.codice_aic);
    if (p.volume_soluzione_ml != null) setVialVolume(String(p.volume_soluzione_ml));
    if (p.is_polvere) {
      setIsPowder(true);
      if (p.volume_solvente_ml != null) {
        setReconVolume(String(p.volume_solvente_ml));
        setReconVolumeUnit("ml");
      }
    }
  };

  const filteredCatSuggestions = category.trim()
    ? categories.filter((c) => c.toLowerCase().includes(category.toLowerCase()) && c !== category)
    : [];

  const handleSave = () => {
    onSave({
      name: name.trim(),
      code: code.trim() || null,
      aic_code: aicCode.trim() || null,
      category: category.trim() || null,
      is_powder: isPowder,
      diluent: isPowder && diluent.trim() ? diluent.trim() : null,
      reconstitution_volume: isPowder && reconVolume ? parseFloat(reconVolume) : null,
      reconstitution_volume_unit: isPowder && reconVolume ? reconVolumeUnit : null,
      specific_gravity: specificGravity ? parseFloat(specificGravity) : null,
      vial_volume: vialVolume ? parseFloat(vialVolume) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Inserisci il nome, cerca su AIFA/ChEMBL e seleziona la confezione per compilare automaticamente i campi.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Sezione: Identificazione ──────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identificazione</p>
            <div className="space-y-1.5">
              <Label htmlFor="drug-name">Nome farmaco</Label>
              <div className="flex gap-2">
                <Input
                  id="drug-name"
                  placeholder="Es. Vancomicina, Methotrexate"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setLookupResults([]); setLookupError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLookup}
                  disabled={!name.trim() || lookupLoading}
                  className="shrink-0"
                >
                  {lookupLoading
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <Search className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Cerca</span>
                </Button>
              </div>
            </div>

            {/* Risultati lookup */}
            {lookupResults.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 divide-y divide-border overflow-hidden">
                <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  {lookupResults[0]?.source === "aifa"
                    ? "Risultati AIFA BdnFarmaci — seleziona per compilare codice AIC"
                    : "Seleziona un risultato — codice ATC e categoria verranno compilati automaticamente"}
                </p>
                {lookupResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyResult(r)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{r.name}</p>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                      )}
                      {!r.description && r.category && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.category}</p>
                      )}
                      {r.company && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">{r.company}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {r.aic_code && (
                        <span className="font-mono text-[11px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 px-1.5 py-0.5 rounded">
                          AIC: {r.aic_code}
                        </span>
                      )}
                      {r.code && (
                        <span className="font-mono text-[11px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                          ATC: {r.code}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{r.source}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {lookupError && (
              <p className="text-xs text-muted-foreground">{lookupError}</p>
            )}
          </div>

          {/* ── Sezione: Codici ───────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Codici</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="drug-code">
                  Codice ATC <span className="text-muted-foreground font-normal text-[11px]">(farmacologico)</span>
                </Label>
                <Input
                  id="drug-code"
                  placeholder="Es. J01XA01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`font-mono ${code ? "border-primary/50 bg-primary/5" : ""}`}
                />
                {code && (
                  <p className="text-[11px] text-muted-foreground">
                    {code.charAt(0)} → {code.slice(0,3)} → {code.slice(0,5)} → {code}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="drug-aic">
                  Codice AIC <span className="text-muted-foreground font-normal text-[11px]">(AIFA Italia)</span>
                </Label>
                <Input
                  id="drug-aic"
                  placeholder="Es. 036081018"
                  value={aicCode}
                  onChange={(e) => setAicCode(e.target.value)}
                  className={`font-mono ${aicCode ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                />
                {aicCode && (
                  <p className="text-[11px] text-muted-foreground">Autorizzazione Immissione in Commercio</p>
                )}
              </div>
            </div>

            {/* Confezione AIFA */}
            {(aicPresentations.length > 0 || aicPresLoading) && (
              <div className="space-y-1.5">
                <Label>
                  Confezione AIFA
                  {aicPresLoading && (
                    <span className="ml-2 text-[11px] text-muted-foreground font-normal">Ricerca in corso...</span>
                  )}
                  {!aicPresLoading && aicPresentations.length > 0 && (
                    <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                      {aicPresentations.length} confezioni — seleziona per compilare AIC, volume e ricostituzione
                    </span>
                  )}
                </Label>
                {!aicPresLoading && aicPresentations.length > 0 && (
                  <Select
                    value={aicCode || ""}
                    onValueChange={(val) => {
                      const pres = aicPresentations.find((p) => p.codice_aic === val);
                      if (pres) applyPresentation(pres);
                    }}
                  >
                    <SelectTrigger className={`text-xs ${aicCode ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                      <SelectValue placeholder="Seleziona confezione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {aicPresentations.map((p) => (
                        <SelectItem key={p.codice_aic} value={p.codice_aic}>
                          <div className="flex flex-col py-0.5 gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{p.denominazione}</span>
                              {p.concentrazione && (
                                <span className="font-mono text-[10px] bg-primary/10 text-primary px-1 rounded">{p.concentrazione}</span>
                              )}
                              {p.is_polvere && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 rounded">POLVERE</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground leading-tight">{p.descrizione}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                              <span>{p.ragione_sociale}</span>
                              {p.forma_breve && <span>· {p.forma_breve}</span>}
                              {p.via_somministrazione && <span>· {p.via_somministrazione}</span>}
                              {p.volume_solvente_ml != null && <span>· Solvente: {p.volume_solvente_ml} ml</span>}
                              <span>· AIC {p.codice_aic}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* ── Sezione: Classificazione e dati tecnici ───────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Classificazione e dati tecnici</p>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria farmacologica</Label>
              {catMode === "select" ? (
                <div className="flex gap-2">
                  <Select
                    value={categories.includes(category) ? category : ""}
                    onValueChange={(val) => setCategory(val)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => { setCategory(""); setCatMode("new"); }}
                  >
                    + Nuova
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Inserisci nuova categoria..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => { setCategory(""); setCatMode("select"); }}
                  >
                    Annulla
                  </Button>
                </div>
              )}
              {catMode === "new" && category.trim() && (
                <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                  La categoria "{category.trim()}" verrà aggiunta al salvataggio.
                </p>
              )}
              {catMode === "select" && category && !categories.includes(category) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                  Categoria rilevata automaticamente: "{category}" — verrà aggiunta al salvataggio.
                </p>
              )}
            </div>

            {/* Volume flacone + Peso specifico */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="drug-vial-volume">
                  Volume flacone <span className="text-muted-foreground font-normal text-[11px]">(ml)</span>
                </Label>
                <Input
                  id="drug-vial-volume"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Es. 20"
                  value={vialVolume}
                  onChange={(e) => setVialVolume(e.target.value)}
                  className={`font-mono ${vialVolume ? "border-primary/50 bg-primary/5" : ""}`}
                />
                <p className="text-[11px] text-muted-foreground">Auto dalla confezione AIFA</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="drug-sg">
                  Peso specifico <span className="text-muted-foreground font-normal text-[11px]">(g/ml)</span>
                </Label>
                <Input
                  id="drug-sg"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="Es. 1.0050"
                  value={specificGravity}
                  onChange={(e) => setSpecificGravity(e.target.value)}
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">ml = g ÷ peso specifico</p>
              </div>
            </div>
          </div>

          {/* ── Sezione: Ricostituzione ───────────────────────────── */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={isPowder}
                onChange={(e) => setIsPowder(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium">Farmaco in polvere</span>
                <span className="ml-2 text-xs text-muted-foreground">(richiede ricostituzione con diluente)</span>
              </div>
            </label>

            {isPowder && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="drug-diluent">
                    Diluente <span className="text-muted-foreground font-normal text-[11px]">(opzionale)</span>
                  </Label>
                  <Input
                    id="drug-diluent"
                    placeholder="Es. Acqua PPI, NaCl 0.9%"
                    value={diluent}
                    onChange={(e) => setDiluent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantità diluente</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Es. 10"
                      value={reconVolume}
                      onChange={(e) => setReconVolume(e.target.value)}
                      className="flex-1 font-mono"
                    />
                    <Select value={reconVolumeUnit} onValueChange={setReconVolumeUnit}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Config() {
  const [cappe, setCappe] = useState<Cappa[]>([]);
  const [loadingCappe, setLoadingCappe] = useState(true);
  const [strategy, setStrategy] = useState<AssignmentStrategy>("urgency");
  const [savingStrategy, setSavingStrategy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCappa, setEditingCappa] = useState<Cappa | null>(null);

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(true);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugDialogOpen, setDrugDialogOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [apiProvider, setApiProvider] = useState<"chembl" | "rxnorm" | "aifa" | "custom">("chembl");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savingApi, setSavingApi] = useState(false);
  const [apiConfigOpen, setApiConfigOpen] = useState(false);
  const [aifaStatus, setAifaStatus] = useState<{ total: number; active: number; updated_at: string | null } | null>(null);
  const [refreshingAifa, setRefreshingAifa] = useState(false);

  // ─── Load data ────────────────────────────────────────────────────────────

  const fetchCappe = useCallback(async () => {
    try {
      const res = await extFetch(`/cappe`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: any[] = await res.json();
      const data: Cappa[] = raw.map((c: any) => ({
        id:          c.id,
        name:        c.name,
        tipologia:   c.tipologia,
        description: c.description ?? null,
        active:      c.active,
        drugRules: (c.drug_rules ?? c.drugRules ?? []).map((r: any) => ({
          id:       r.id,
          cappaId:  r.cappa_id  ?? r.cappaId,
          drugName: r.drug_name ?? r.drugName ?? null,
          category: r.category  ?? null,
          ruleType: r.rule_type ?? r.ruleType,
        })),
      }));
      setCappe(data);
    } catch {
      toast.error("Impossibile caricare le cappe");
    } finally {
      setLoadingCappe(false);
    }
  }, []);

  const fetchStrategy = useCallback(async () => {
    try {
      const res = await extFetch(`/config/assignment`);
      if (!res.ok) return;
      const data: { strategy: AssignmentStrategy } = await res.json();
      setStrategy(data.strategy);
    } catch {
      // silenzioso — default mantenuto
    }
  }, []);

  const fetchDrugs = useCallback(async () => {
    try {
      const res = await extFetch(`/config/drugs`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrugs(await res.json());
    } catch {
      toast.error("Impossibile caricare il catalogo farmaci");
    } finally {
      setLoadingDrugs(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await extFetch(`/drugs/categories`);
      if (res.ok) setCategories(await res.json());
    } catch { /* silenzioso */ }
  }, []);

  const fetchApiConfig = useCallback(async () => {
    try {
      const res = await extFetch(`/config/drug-api`);
      if (!res.ok) return;
      const d = await res.json();
      setApiProvider(d.provider ?? "chembl");
      setApiBaseUrl(d.base_url ?? "");
      setApiKey(d.api_key ?? "");
    } catch { /* silenzioso */ }
  }, []);

  const fetchAifaStatus = useCallback(async () => {
    try {
      const res = await extFetch(`/config/drug-api/aifa-status`);
      if (res.ok) setAifaStatus(await res.json());
    } catch { /* silenzioso */ }
  }, []);

  const handleRefreshAifa = async () => {
    setRefreshingAifa(true);
    try {
      const res = await extFetch(`/config/drug-api/refresh-aifa`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail ?? `HTTP ${res.status}`);
      toast.success(`Dataset AIFA aggiornato: ${d.imported.toLocaleString()} farmaci importati`);
      fetchAifaStatus();
    } catch (err: unknown) {
      toast.error("Aggiornamento AIFA fallito", { description: String(err) });
    } finally {
      setRefreshingAifa(false);
    }
  };

  useEffect(() => {
    fetchCappe();
    fetchStrategy();
    fetchDrugs();
    fetchCategories();
    fetchApiConfig();
    fetchAifaStatus();
  }, [fetchCappe, fetchStrategy, fetchDrugs, fetchCategories, fetchApiConfig, fetchAifaStatus]);

  // ─── Cappe CRUD ───────────────────────────────────────────────────────────

  const handleCappaSaved = () => {
    fetchCappe();
    setDialogOpen(false);
    setEditingCappa(null);
  };

  const handleDeleteCappa = async (id: number) => {
    try {
      const res = await extFetch(`/config/cappe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cappa eliminata");
    } catch (err: unknown) {
      toast.error("Errore nell'eliminazione", { description: String(err) });
    }
  };

  const handleToggleActive = async (cappa: Cappa) => {
    try {
      const res = await extFetch(`/config/cappe/${cappa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cappa.name, tipologia: cappa.tipologia, description: cappa.description, active: !cappa.active }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.map((c) => c.id === cappa.id ? { ...c, active: !cappa.active } : c));
    } catch (err: unknown) {
      toast.error("Errore nell'aggiornamento", { description: String(err) });
    }
  };

  const handleAddDrugRule = async (
    cappaId: number,
    drugName: string | null,
    category: string | null,
    ruleType: RuleType,
  ) => {
    try {
      const res = await extFetch(`/config/cappe/${cappaId}/drug-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drug_name: drugName, category, rule_type: ruleType }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r: any = await res.json();
      const rule: DrugRule = {
        id:       r.id,
        cappaId:  r.cappa_id  ?? r.cappaId,
        drugName: r.drug_name ?? r.drugName ?? null,
        category: r.category  ?? null,
        ruleType: r.rule_type ?? r.ruleType,
      };
      setCappe((prev) => prev.map((c) => c.id === cappaId ? { ...c, drugRules: [...c.drugRules, rule] } : c));
    } catch (err: unknown) {
      toast.error("Errore nell'aggiunta della regola", { description: String(err) });
    }
  };

  const handleDeleteDrugRule = async (ruleId: number, cappaId: number) => {
    try {
      const res = await extFetch(`/config/drug-rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.map((c) => c.id === cappaId ? { ...c, drugRules: c.drugRules.filter((r) => r.id !== ruleId) } : c));
    } catch (err: unknown) {
      toast.error("Errore nell'eliminazione della regola", { description: String(err) });
    }
  };

  // ─── Drugs CRUD ───────────────────────────────────────────────────────────

  const handleSaveDrug = async (data: Omit<Drug, "id">) => {
    try {
      if (editingDrug) {
        const res = await extFetch(`/config/drugs/${editingDrug.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDrugs((prev) => prev.map((d) => d.id === editingDrug.id ? { ...d, ...data } : d));
        toast.success("Farmaco aggiornato");
      } else {
        const res = await extFetch(`/config/drugs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created: Drug = await res.json();
        setDrugs((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Farmaco aggiunto al catalogo");
      }
      // Refresh categories in case a new one was added
      fetchCategories();
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setDrugDialogOpen(false);
      setEditingDrug(null);
    }
  };

  const handleDeleteDrug = async (id: number) => {
    try {
      const res = await extFetch(`/config/drugs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrugs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Farmaco rimosso dal catalogo");
    } catch (err: unknown) {
      toast.error("Errore nella rimozione", { description: String(err) });
    }
  };

  const handleApproveDrug = async (id: number) => {
    try {
      const res = await extFetch(`/config/drugs/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrugs((prev) => prev.map((d) => d.id === id ? { ...d, needs_review: false } : d));
      toast.success("Farmaco verificato");
    } catch (err: unknown) {
      toast.error("Errore nella verifica", { description: String(err) });
    }
  };

  const filteredDrugs = drugs.filter((d) => {
    const q = drugSearch.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q)
      || (d.aic_code ?? "").toLowerCase().includes(q) || (d.category ?? "").toLowerCase().includes(q);
  });

  // ─── Categories CRUD ──────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await extFetch(`/config/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory("");
    } catch (err: unknown) {
      toast.error("Errore nell'aggiunta", { description: String(err) });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await extFetch(`/config/categories/${id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error("Errore nella rimozione", { description: String(err) });
    }
  };

  // ─── API config ───────────────────────────────────────────────────────────

  const handleSaveApiConfig = async () => {
    setSavingApi(true);
    try {
      const res = await extFetch(`/config/drug-api`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: apiProvider, base_url: apiBaseUrl || null, api_key: apiKey || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Configurazione API salvata");
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setSavingApi(false);
    }
  };

  // ─── Assignment strategy ───────────────────────────────────────────────────

  const handleSaveStrategy = async () => {
    setSavingStrategy(true);
    try {
      const res = await extFetch(`/config/assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Strategia di assegnazione salvata");
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setSavingStrategy(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Configurazione sistema</h1>
            <p className="text-sm text-muted-foreground">Gestione cappe e strategie di assegnazione</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2.5 py-1.5 rounded-md">
            <ShieldCheck className="h-3.5 w-3.5" />
            Area riservata agli amministratori
          </div>
        </div>

        <Tabs defaultValue="cappe">
          <TabsList className="mb-6">
            <TabsTrigger value="cappe">Cappe</TabsTrigger>
            <TabsTrigger value="farmaci">Farmaci</TabsTrigger>
            <TabsTrigger value="assignment">Strategia assegnazione</TabsTrigger>
            <TabsTrigger value="processi">Processi</TabsTrigger>
          </TabsList>

          {/* ─── Tab: Cappe ─── */}
          <TabsContent value="cappe">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Definisci le cappe della farmacia, la loro tipologia e le regole sui farmaci.
              </p>
              <Button
                size="sm"
                onClick={() => { setEditingCappa(null); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Aggiungi cappa
              </Button>
            </div>

            {loadingCappe ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Caricamento...</div>
            ) : cappe.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground text-sm mb-3">Nessuna cappa configurata</p>
                  <Button size="sm" onClick={() => { setEditingCappa(null); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1.5" /> Aggiungi la prima cappa
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cappe.map((cappa) => (
                  <CappaCard
                    key={cappa.id}
                    cappa={cappa}
                    onEdit={() => { setEditingCappa(cappa); setDialogOpen(true); }}
                    onDelete={() => handleDeleteCappa(cappa.id)}
                    onToggleActive={() => handleToggleActive(cappa)}
                    onDeleteDrugRule={(ruleId) => handleDeleteDrugRule(ruleId, cappa.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Tab: Farmaci ─── */}
          <TabsContent value="farmaci" className="space-y-5">

            {/* Configurazione API lookup */}
            <Card>
              <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setApiConfigOpen((v) => !v)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" /> Configurazione API lookup farmaci
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{apiConfigOpen ? "Nascondi" : "Mostra"}</span>
                </div>
                {!apiConfigOpen && (
                  <CardDescription className="text-xs mt-1">
                    Provider attivo: <span className="font-medium text-foreground capitalize">{apiProvider}</span>
                    {apiProvider === "chembl" && " · ChEMBL (EBI) — ATC codes, farmaci europei"}
                    {apiProvider === "rxnorm" && " · RxNorm (NLM) — farmaci USA"}
                    {apiProvider === "aifa"   && " · AIFA BdnFarmaci — codici AIC italiani"}
                    {apiProvider === "custom" && apiBaseUrl && ` · ${apiBaseUrl}`}
                  </CardDescription>
                )}
              </CardHeader>
              {apiConfigOpen && (
                <CardContent className="space-y-4">
                  {/* Provider selector */}
                  <div className="space-y-2">
                    <Label className="text-xs">Provider</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {([
                        { value: "chembl", label: "ChEMBL (EBI)", desc: "Codici ATC, farmaci europei — gratuito", url: "https://www.ebi.ac.uk/chembl/" },
                        { value: "rxnorm", label: "RxNorm (NLM)", desc: "Database FDA USA — gratuito", url: "https://rxnav.nlm.nih.gov/" },
                        { value: "aifa",   label: "AIFA BdnFarmaci", desc: "Banca Dati Nazionale Farmaci — codici AIC italiani", url: "https://farmaci.agenziafarmaco.gov.it/" },
                        { value: "custom", label: "Custom URL", desc: "API proprietaria o interna", url: null },
                      ] as const).map(({ value, label, desc, url }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setApiProvider(value)}
                          className={cn(
                            "text-left p-3 rounded-lg border-2 transition-all",
                            apiProvider === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          )}
                        >
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-primary hover:underline mt-1 inline-block"
                            >
                              {url}
                            </a>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {apiProvider === "aifa" && aifaStatus && (
                    <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 space-y-1">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Dataset locale AIFA BdnFarmaci</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Totale: <span className="font-medium text-foreground">{aifaStatus.total.toLocaleString()}</span> farmaci</span>
                        <span>Attivi (AIC): <span className="font-medium text-foreground">{aifaStatus.active.toLocaleString()}</span></span>
                        <span>
                          Ultimo aggiornamento:{" "}
                          <span className="font-medium text-foreground">
                            {aifaStatus.updated_at
                              ? new Date(aifaStatus.updated_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })
                              : "—"}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Aggiornamento automatico ogni giorno a mezzanotte · fonte:{" "}
                        <span className="font-mono">drive.aifa.gov.it</span>
                      </p>
                    </div>
                  )}

                  {apiProvider === "custom" && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">URL base API</Label>
                        <Input
                          placeholder="https://api.example.com/drugs/search"
                          value={apiBaseUrl}
                          onChange={(e) => setApiBaseUrl(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">Il parametro <code>?name=</code> verrà aggiunto automaticamente.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Key <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
                        <Input
                          type="password"
                          placeholder="Bearer token o API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveApiConfig} disabled={savingApi}>
                      {savingApi ? "Salvataggio..." : "Salva configurazione API"}
                    </Button>
                    {apiProvider === "aifa" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefreshAifa}
                        disabled={refreshingAifa}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshingAifa ? "animate-spin" : ""}`} />
                        {refreshingAifa ? "Aggiornamento..." : "Aggiorna dataset AIFA"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Catalogo farmaci */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h3 className="text-sm font-medium text-foreground">Catalogo farmaci</h3>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-8 pl-8 w-48 text-xs"
                      placeholder="Cerca..."
                      value={drugSearch}
                      onChange={(e) => setDrugSearch(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={() => { setEditingDrug(null); setDrugDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1.5" /> Aggiungi farmaco
                  </Button>
                </div>
              </div>

              {loadingDrugs ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Caricamento...</div>
              ) : filteredDrugs.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Pill className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm mb-3">
                      {drugSearch ? "Nessun farmaco trovato" : "Catalogo farmaci vuoto"}
                    </p>
                    {!drugSearch && (
                      <Button size="sm" onClick={() => { setEditingDrug(null); setDrugDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Aggiungi il primo farmaco
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Codice ATC</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Codice AIC</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Categoria</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Polvere</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ricostituzione</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Peso spec.</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Vol. flacone</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDrugs.map((drug) => (
                        <tr key={drug.id} className={drug.needs_review ? "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/40 transition-colors border-l-2 border-yellow-400" : "hover:bg-muted/20 transition-colors"}>
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {drug.name}
                              {drug.needs_review && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 shrink-0">
                                  DA VERIFICARE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {drug.code
                              ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{drug.code}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {drug.aic_code
                              ? <span className="font-mono text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">{drug.aic_code}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {drug.category
                              ? <Badge variant="secondary" className="text-[11px] font-normal">{drug.category}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {drug.is_powder
                              ? <Check className="h-4 w-4 text-primary mx-auto" />
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {drug.is_powder && drug.reconstitution_volume
                              ? <span>{drug.reconstitution_volume} {drug.reconstitution_volume_unit ?? "ml"}{drug.diluent ? ` · ${drug.diluent}` : ""}</span>
                              : <span>—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {drug.specific_gravity ?? <span>—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {drug.vial_volume != null ? <span>{drug.vial_volume} ml</span> : <span>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {drug.needs_review && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-600 hover:text-green-600"
                                  title="Segna come verificato"
                                  onClick={() => handleApproveDrug(drug.id)}>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setEditingDrug(drug); setDrugDialogOpen(true); }}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteDrug(drug.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                    {filteredDrugs.length} farmac{filteredDrugs.length === 1 ? "o" : "i"}
                    {drugSearch && ` · filtrati su ${drugs.length} totali`}
                  </div>
                </div>
              )}
            </div>

            {/* Gestione categorie */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categorie farmaci</CardTitle>
                <CardDescription className="text-xs">Usate come suggerimenti nel form di aggiunta farmaci.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="Nuova categoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                  />
                  <Button size="sm" className="h-8 px-2" disabled={!newCategory.trim()} onClick={handleAddCategory}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <span key={cat.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      {cat.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nessuna categoria configurata</span>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ─── Tab: Strategia assegnazione ─── */}
          <TabsContent value="assignment">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm text-muted-foreground">
                Scegli la logica con cui le prescrizioni HL7 vengono assegnate alle cappe al momento dell'importazione.
              </p>
              <div className="space-y-3">
                {STRATEGIES.map(({ value, label, description, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStrategy(value)}
                    className={cn(
                      "w-full text-left flex items-start gap-4 p-4 rounded-lg border-2 transition-all",
                      strategy === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      strategy === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{label}</span>
                        {strategy === value && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">Attiva</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <Button onClick={handleSaveStrategy} disabled={savingStrategy}>
                  {savingStrategy ? "Salvataggio..." : "Salva strategia"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ─── Tab: Processi ─── */}
          <TabsContent value="processi">
            <ProcessConfigTab />
          </TabsContent>

        </Tabs>
      </main>

      <CappaDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCappa(null); }}
        onSaved={handleCappaSaved}
        initial={editingCappa ?? undefined}
        categories={categories.map((c) => c.name)}
        title={editingCappa ? "Modifica cappa" : "Nuova cappa"}
      />

      <DrugDialog
        open={drugDialogOpen}
        onClose={() => { setDrugDialogOpen(false); setEditingDrug(null); }}
        onSave={handleSaveDrug}
        initial={editingDrug ?? undefined}
        categories={categories.map((c) => c.name)}
        title={editingDrug ? "Modifica farmaco" : "Nuovo farmaco"}
      />
    </div>
  );
}
