import { Plus, Edit2, Trash2, Check, X, Search, RefreshCw, ShieldCheck, Pill, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DrugDialog } from "./DrugDialog";
import { useFarmaciData } from "./useFarmaciData";

export function FarmaciTab() {
  const {
    loadingDrugs,
    drugSearch,
    setDrugSearch,
    drugDialogOpen,
    setDrugDialogOpen,
    editingDrug,
    setEditingDrug,
    categories,
    processConfigs,
    newCategory,
    setNewCategory,
    apiProvider,
    setApiProvider,
    apiBaseUrl,
    setApiBaseUrl,
    apiKey,
    setApiKey,
    savingApi,
    apiConfigOpen,
    setApiConfigOpen,
    aifaStatus,
    refreshingAifa,
    filteredDrugs,
    drugs,
    handleSaveDrug,
    handleDeleteDrug,
    handleApproveDrug,
    handleAddCategory,
    handleDeleteCategory,
    handleSaveApiConfig,
    handleRefreshAifa,
  } = useFarmaciData();

  return (
    <div className="space-y-5">
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
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">ATC</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">AIC</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Categoria</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Polvere</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Ricostituzione</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Peso sp.</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Vol.</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Processo</th>
                  <th className="px-3 py-1.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDrugs.map((drug) => (
                  <tr key={drug.id} className={drug.needs_review ? "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/40 transition-colors border-l-2 border-yellow-400" : "hover:bg-muted/20 transition-colors"}>
                    <td className="px-3 py-1.5 font-medium text-foreground text-sm">
                      <div className="flex items-center gap-1.5">
                        {drug.name}
                        {drug.needs_review && (
                          <span className="text-[10px] font-semibold px-1 py-px rounded bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 shrink-0">
                            DA VERIF.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      {drug.code
                        ? <span className="font-mono text-xs bg-muted px-1 py-px rounded">{drug.code}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      {drug.aic_code
                        ? <span className="font-mono text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1 py-px rounded">{drug.aic_code}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      {drug.category
                        ? <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-px">{drug.category}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {drug.is_powder
                        ? <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {drug.is_powder && drug.reconstitution_volume
                        ? <span>{drug.reconstitution_volume} {drug.reconstitution_volume_unit ?? "ml"}{drug.diluent ? ` · ${drug.diluent}` : ""}</span>
                        : <span>—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs font-mono text-muted-foreground">
                      {drug.specific_gravity ?? <span>—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs font-mono text-muted-foreground">
                      {drug.vial_volume != null ? <span>{drug.vial_volume} ml</span> : <span>—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {drug.process_config_id != null
                        ? <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-px">
                            {processConfigs.find((p) => p.id === drug.process_config_id)?.name ?? drug.process_config_id}
                          </Badge>
                        : <span>—</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        {drug.needs_review && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-600 hover:text-green-600"
                            title="Segna come verificato"
                            onClick={() => handleApproveDrug(drug.id)}>
                            <ShieldCheck className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditingDrug(drug); setDrugDialogOpen(true); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDrug(drug.id)}>
                          <Trash2 className="h-3 w-3" />
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
