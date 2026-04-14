import { useState, useEffect } from "react";
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
import { atcToCategory } from "@/lib/atcCategories";
import type { Drug, ProcessConfig } from "@/components/config/types";
import { useDrugLookup, type LookupResult, type AicPresentation } from "@/components/config/useDrugLookup";
import { DrugLookupSection } from "@/components/config/DrugLookupSection";

export interface DrugDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Drug, "id">) => void;
  initial?: Drug;
  categories: string[];
  title: string;
}

function composeName(active: string, conc: string, vialVol: string): string {
  return [active.trim(), conc.trim(), vialVol.trim() ? `${vialVol.trim()} ml` : ""].filter(Boolean).join(" ");
}

export function DrugDialog({ open, onClose, onSave, initial, categories, title }: DrugDialogProps) {
  const [processConfigs,  setProcessConfigs]  = useState<ProcessConfig[]>([]);
  const [activeIngredient,setActiveIngredient]= useState(initial?.active_ingredient ?? initial?.name ?? "");
  const [concentration,   setConcentration]   = useState(initial?.concentration ?? "");
  const [code,            setCode]            = useState(initial?.code ?? "");
  const [aicCode,         setAicCode]         = useState(initial?.aic_code ?? "");
  const [category,        setCategory]        = useState(initial?.category ?? "");
  const [isPowder,        setIsPowder]        = useState(initial?.is_powder ?? false);
  const [enabled,         setEnabled]         = useState(initial?.enabled ?? true);
  const [diluent,         setDiluent]         = useState(initial?.diluent ?? "");
  const [reconVolume,     setReconVolume]     = useState(initial?.reconstitution_volume?.toString() ?? "");
  const [reconVolumeUnit, setReconVolumeUnit] = useState(initial?.reconstitution_volume_unit ?? "ml");
  const [specificGravity, setSpecificGravity] = useState(initial?.specific_gravity?.toString() ?? "");
  const [vialVolume,      setVialVolume]      = useState(initial?.vial_volume?.toString() ?? "");
  const [processConfigId, setProcessConfigId] = useState<string>(initial?.process_config_id?.toString() ?? "");
  const [catMode,         setCatMode]         = useState<"select" | "new">("select");
  const [barcodeCode,     setBarcodeCode]     = useState(initial?.barcode_code ?? initial?.aic_code ?? "");

  const {
    lookupResults,
    lookupLoading,
    lookupError,
    aicPresentations,
    aicPresLoading,
    medicinaliData,
    medicinaliLoading,
    handleLookup,
    clearLookupResults,
    clearLookupError,
  } = useDrugLookup({ open, name: activeIngredient, aicCode });

  useEffect(() => {
    if (open) {
      setActiveIngredient(initial?.active_ingredient ?? initial?.name ?? "");
      setConcentration(initial?.concentration ?? "");
      setCode(initial?.code ?? "");
      setAicCode(initial?.aic_code ?? "");
      const initCode = initial?.code ?? "";
      // Deriva la categoria dai primi 3 caratteri dell'ATC; fallback alla categoria salvata
      const atcCat = initCode ? atcToCategory(initCode) : null;
      const initCat = atcCat ?? initial?.category ?? "";
      setCategory(initCat);
      setIsPowder(initial?.is_powder ?? false);
      setEnabled(initial?.enabled ?? true);
      setDiluent(initial?.diluent ?? "");
      setReconVolume(initial?.reconstitution_volume?.toString() ?? "");
      setReconVolumeUnit(initial?.reconstitution_volume_unit ?? "ml");
      setSpecificGravity(initial?.specific_gravity?.toString() ?? "");
      setVialVolume(initial?.vial_volume?.toString() ?? "");
      setProcessConfigId(initial?.process_config_id?.toString() ?? "");
      setBarcodeCode(initial?.barcode_code ?? initial?.aic_code ?? "");
      clearLookupResults();
      clearLookupError();
      setCatMode(initCat && !categories.includes(initCat) ? "new" : "select");
      extFetch("/config/process-configs")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setProcessConfigs(Array.isArray(data) ? data.map(({ id, name }: { id: number; name: string }) => ({ id, name })) : []))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // Quando cambia il codice ATC, decodifica sempre la categoria dai primi 3 caratteri
  useEffect(() => {
    if (code) {
      const decoded = atcToCategory(code);
      if (decoded) {
        setCategory(decoded);
        setCatMode("select");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const applyResult = (r: LookupResult) => {
    setActiveIngredient(r.name);
    const newCode = r.code ?? "";
    setCode(newCode);
    if (r.aic_code) setAicCode(r.aic_code);
    // Deriva sempre la categoria dall'ATC; fallback alla categoria del lookup
    const cat = (newCode ? atcToCategory(newCode) : null) ?? r.category ?? "";
    setCategory(cat);
    if (cat && !categories.includes(cat)) setCatMode("new");
    else setCatMode("select");
    clearLookupResults();
  };

  const applyPresentation = (p: AicPresentation) => {
    setAicCode(p.codice_aic);
    if (p.concentrazione) setConcentration(p.concentrazione);
    if (p.volume_soluzione_ml != null) setVialVolume(String(p.volume_soluzione_ml));
    // Confezione da ricerca live: applica anche ATC e principio attivo se mancanti
    if (p.codice_atc) {
      setCode(p.codice_atc);
      const cat = atcToCategory(p.codice_atc);
      if (cat) { setCategory(cat); setCatMode(categories.includes(cat) ? "select" : "new"); }
    }
    if (p.principio_attivo && !activeIngredient.trim()) {
      setActiveIngredient(p.principio_attivo);
    }
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
    const atcCode = medicinaliData.codice_atc;
    if (atcCode && !code) setCode(atcCode);
    if (!category) {
      const cat = (atcCode ? atcToCategory(atcCode) : null) ?? medicinaliData.descrizione_atc;
      if (cat) {
        setCategory(cat);
        if (!categories.includes(cat)) setCatMode("new");
        else setCatMode("select");
      }
    }
  };

  const handleSave = () => {
    const active = activeIngredient.trim();
    const conc = concentration.trim();
    const composed = composeName(active, conc, vialVolume);
    onSave({
      name: composed || active,
      active_ingredient: active || null,
      concentration: conc || null,
      code: code.trim() || null,
      aic_code: aicCode.trim() || null,
      category: category.trim() || null,
      is_powder: isPowder,
      enabled,
      diluent: isPowder && diluent.trim() ? diluent.trim() : null,
      reconstitution_volume: isPowder && reconVolume ? parseFloat(reconVolume) : null,
      reconstitution_volume_unit: isPowder && reconVolume ? reconVolumeUnit : null,
      specific_gravity: specificGravity ? parseFloat(specificGravity) : null,
      vial_volume: vialVolume ? parseFloat(vialVolume) : null,
      process_config_id: processConfigId ? parseInt(processConfigId) : null,
      needs_review: initial?.needs_review ?? false,
      barcode_code: barcodeCode.trim() || null,
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

          <DrugLookupSection
            name={activeIngredient}
            onNameChange={(v) => { setActiveIngredient(v); clearLookupResults(); clearLookupError(); }}
            aicCode={aicCode}
            onAicCodeChange={setAicCode}
            code={code}
            onCodeChange={setCode}
            lookupResults={lookupResults}
            lookupLoading={lookupLoading}
            lookupError={lookupError}
            aicPresentations={aicPresentations}
            aicPresLoading={aicPresLoading}
            medicinaliData={medicinaliData}
            medicinaliLoading={medicinaliLoading}
            handleLookup={handleLookup}
            onApplyResult={applyResult}
            onApplyPresentation={applyPresentation}
            onApplyMedicinali={applyMedicinali}
          />

          {/* ── Sezione: Concentrazione + nome composto ───────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Concentrazione e nome</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="drug-concentration">
                  Concentrazione <span className="text-muted-foreground font-normal text-[11px]">(opzionale)</span>
                </Label>
                <Input
                  id="drug-concentration"
                  placeholder="Es. 5 mg/ml, 50 mg"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Auto dalla confezione AIFA</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nome composto <span className="text-muted-foreground font-normal text-[11px]">(calcolato)</span></Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-border bg-muted/30 text-sm font-mono text-muted-foreground">
                  {composeName(activeIngredient, concentration, vialVolume) || <span className="italic text-xs">principio attivo + conc. + volume</span>}
                </div>
              </div>
            </div>
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

          {/* ── Sezione: Stato ───────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="drug-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="drug-enabled" className="text-xs cursor-pointer">Farmaco attivo</Label>
          </div>

          {/* ── Sezione: Barcode ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="drug-barcode">
              Barcode <span className="text-muted-foreground font-normal text-[11px]">(opzionale)</span>
            </Label>
            <Input
              id="drug-barcode"
              placeholder="Es. 8034173530041"
              value={barcodeCode}
              onChange={(e) => setBarcodeCode(e.target.value)}
              className="font-mono"
            />
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
          <Button onClick={handleSave} disabled={!activeIngredient.trim()}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
