import { useState, useCallback, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X, Search, RefreshCw, ShieldCheck, Pill, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extFetch } from "@/lib/apiClient";
import { DrugDialog } from "./DrugDialog";
import type { Drug, ProcessConfig } from "./types";

export function FarmaciTab() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(true);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugDialogOpen, setDrugDialogOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [processConfigs, setProcessConfigs] = useState<ProcessConfig[]>([]);

  const [apiProvider, setApiProvider] = useState<"chembl" | "rxnorm" | "aifa" | "custom">("chembl");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savingApi, setSavingApi] = useState(false);
  const [apiConfigOpen, setApiConfigOpen] = useState(false);
  const [aifaStatus, setAifaStatus] = useState<{ total: number; active: number; updated_at: string | null } | null>(null);
  const [refreshingAifa, setRefreshingAifa] = useState(false);

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

  useEffect(() => {
    fetchDrugs();
    fetchCategories();
    fetchApiConfig();
    fetchAifaStatus();
    extFetch("/config/process-configs")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProcessConfigs(Array.isArray(data) ? data.map(({ id, name }: { id: number; name: string }) => ({ id, name })) : []))
      .catch(() => {});
  }, [fetchDrugs, fetchCategories, fetchApiConfig, fetchAifaStatus]);

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

  const filteredDrugs = drugs.filter((d) => {
    const q = drugSearch.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q)
      || (d.aic_code ?? "").toLowerCase().includes(q) || (d.category ?? "").toLowerCase().includes(q);
  });

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
