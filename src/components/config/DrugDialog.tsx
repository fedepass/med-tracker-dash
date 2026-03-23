import { useState, useEffect } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { extFetch } from "@/lib/apiClient";
import type { Drug, ProcessConfig } from "./types";

interface LookupResult {
  name: string;
  code: string | null;
  aic_code?: string | null;
  category: string | null;
  description?: string | null;
  company?: string | null;
  source?: string;
}

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

export interface DrugDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Drug, "id">) => void;
  initial?: Drug;
  categories: string[];
  title: string;
}

export function DrugDialog({ open, onClose, onSave, initial, categories, title }: DrugDialogProps) {
  const [processConfigs, setProcessConfigs] = useState<ProcessConfig[]>([]);
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
  const [processConfigId,         setProcessConfigId]         = useState<string>(initial?.process_config_id?.toString() ?? "");
  const [lookupLoading,           setLookupLoading]           = useState(false);
  const [lookupResults,           setLookupResults]           = useState<LookupResult[]>([]);
  const [lookupError,             setLookupError]             = useState<string | null>(null);
  const [catMode,                 setCatMode]                 = useState<"select" | "new">("select");
  const [aicPresentations,        setAicPresentations]        = useState<AicPresentation[]>([]);
  const [aicPresLoading,          setAicPresLoading]          = useState(false);
  const [medicinaliData,          setMedicinaliData]          = useState<{
    denominazione: string; forma_farmaceutica: string; is_polvere: boolean;
    volume_ml: number | null; codice_atc: string | null; descrizione_atc: string | null;
    azienda: string; denominazione_package: string;
  } | null>(null);
  const [medicinaliLoading,       setMedicinaliLoading]       = useState(false);

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
      setProcessConfigId(initial?.process_config_id?.toString() ?? "");
      setLookupResults([]);
      setLookupError(null);
      setAicPresentations([]);
      setMedicinaliData(null);
      setCatMode(initCat && !categories.includes(initCat) ? "new" : "select");
      extFetch("/config/process-configs")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setProcessConfigs(Array.isArray(data) ? data.map(({ id, name }: { id: number; name: string }) => ({ id, name })) : []))
        .catch(() => {});
    }
  }, [open, initial]);

  // Fetch live da AIFA Medicinali quando AIC è 6+ cifre
  useEffect(() => {
    const digits = aicCode.replace(/\D/g, "");
    if (!open || digits.length < 6) { setMedicinaliData(null); return; }
    const timer = setTimeout(async () => {
      setMedicinaliLoading(true);
      try {
        const res = await extFetch(`/config/drug-lookup/medicinali-live?aic=${encodeURIComponent(digits)}`);
        if (res.ok) setMedicinaliData(await res.json());
        else setMedicinaliData(null);
      } catch { setMedicinaliData(null); } finally {
        setMedicinaliLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [aicCode, open]);

  // Debounced AIC presentations fetch
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

  const applyMedicinali = () => {
    if (!medicinaliData) return;
    if (medicinaliData.volume_ml != null) setVialVolume(String(medicinaliData.volume_ml));
    if (medicinaliData.is_polvere) setIsPowder(true);
    if (medicinaliData.codice_atc && !code) setCode(medicinaliData.codice_atc);
  };

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
      process_config_id: processConfigId ? parseInt(processConfigId) : null,
      needs_review: initial?.needs_review ?? false,
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

            {(medicinaliLoading || medicinaliData) && (
              <div className={`rounded-md border px-3 py-2.5 space-y-1.5 ${medicinaliData ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" : "border-border"}`}>
                {medicinaliLoading && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Ricerca su AIFA Medicinali...
                  </p>
                )}
                {medicinaliData && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{medicinaliData.denominazione}</p>
                        <p className="text-[11px] text-muted-foreground">{medicinaliData.forma_farmaceutica}</p>
                        {medicinaliData.azienda && (
                          <p className="text-[10px] text-muted-foreground/70">{medicinaliData.azienda}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {medicinaliData.is_polvere && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">POLVERE</span>
                        )}
                        {medicinaliData.volume_ml != null && (
                          <span className="font-mono text-[11px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">{medicinaliData.volume_ml} ml</span>
                        )}
                        {medicinaliData.codice_atc && (
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{medicinaliData.codice_atc}</span>
                        )}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs w-full" onClick={applyMedicinali}>
                      Applica dati AIFA Medicinali
                    </Button>
                  </>
                )}
              </div>
            )}

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

          {/* ── Sezione: Configurazione processo ─────────────────── */}
          {processConfigs.length > 0 && (
            <div className="space-y-1.5">
              <Label>Configurazione processo</Label>
              <Select value={processConfigId || ""} onValueChange={setProcessConfigId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona configurazione..." />
                </SelectTrigger>
                <SelectContent>
                  {processConfigs.map((pc) => (
                    <SelectItem key={pc.id} value={pc.id.toString()}>{pc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
