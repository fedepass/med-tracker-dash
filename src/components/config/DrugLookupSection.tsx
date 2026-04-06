import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LookupResult, AicPresentation, MedicinaliData } from "@/components/config/useDrugLookup";

export interface DrugLookupSectionProps {
  // Name field (shared with form)
  name: string;
  onNameChange: (value: string) => void;

  // AIC field (shared with form)
  aicCode: string;
  onAicCodeChange: (value: string) => void;

  // ATC code field (shared with form)
  code: string;
  onCodeChange: (value: string) => void;

  // Lookup state from useDrugLookup
  lookupResults: LookupResult[];
  lookupLoading: boolean;
  lookupError: string | null;
  aicPresentations: AicPresentation[];
  aicPresLoading: boolean;
  medicinaliData: MedicinaliData | null;
  medicinaliLoading: boolean;
  handleLookup: () => Promise<void>;

  // Apply callbacks (handled in DrugDialog)
  onApplyResult: (r: LookupResult) => void;
  onApplyPresentation: (p: AicPresentation) => void;
  onApplyMedicinali: () => void;
}

export function DrugLookupSection({
  name,
  onNameChange,
  aicCode,
  onAicCodeChange,
  code,
  onCodeChange,
  lookupResults,
  lookupLoading,
  lookupError,
  aicPresentations,
  aicPresLoading,
  medicinaliData,
  medicinaliLoading,
  handleLookup,
  onApplyResult,
  onApplyPresentation,
  onApplyMedicinali,
}: DrugLookupSectionProps) {
  return (
    <>
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
              onChange={(e) => onNameChange(e.target.value)}
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
                onClick={() => onApplyResult(r)}
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
              onChange={(e) => onCodeChange(e.target.value)}
              className={`font-mono ${code ? "border-primary/50 bg-primary/5" : ""}`}
            />
            {code && (
              <p className="text-[11px] text-muted-foreground">
                {code.charAt(0)} → {code.slice(0, 3)}
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
              onChange={(e) => onAicCodeChange(e.target.value)}
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
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs w-full" onClick={onApplyMedicinali}>
                  Applica dati AIFA Medicinali
                </Button>
              </>
            )}
          </div>
        )}

        {(aicPresentations.length > 0 || aicPresLoading) && (
          <div className="space-y-1.5">
            <Label>
              Confezioni AIFA
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
              <div className="rounded-md border border-border divide-y divide-border overflow-y-auto max-h-72">
                {aicPresentations.map((p) => (
                  <button
                    key={p.codice_aic}
                    type="button"
                    onClick={() => onApplyPresentation(p)}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors",
                      aicCode === p.codice_aic
                        ? "bg-amber-50/80 dark:bg-amber-950/30 border-l-2 border-amber-500"
                        : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-foreground">{p.denominazione}</span>
                          {p.principio_attivo && (
                            <span className="text-[10px] text-muted-foreground italic">{p.principio_attivo}</span>
                          )}
                          {p.concentrazione && (
                            <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 rounded">{p.concentrazione}</span>
                          )}
                          {p.is_polvere && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-medium">POLVERE</span>
                          )}
                          {p.volume_soluzione_ml != null && (
                            <span className="font-mono text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">{p.volume_soluzione_ml} ml</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.descrizione}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5 flex-wrap">
                          <span>{p.ragione_sociale}</span>
                          {p.forma_breve && <span>· {p.forma_breve}</span>}
                          {p.via_somministrazione && <span>· {p.via_somministrazione}</span>}
                          {p.volume_solvente_ml != null && <span>· Solvente: {p.volume_solvente_ml} ml</span>}
                          {p.quantita_confezione != null && p.unita_confezione && (
                            <span>· {p.quantita_confezione} {p.unita_confezione}</span>
                          )}
                          <span className="font-mono">AIC {p.codice_aic}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
