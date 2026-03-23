import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { extFetch } from "@/lib/apiClient";
import type { Drug, ProcessConfig } from "./types";

interface UseFarmaciDataReturn {
  drugs: Drug[];
  loadingDrugs: boolean;
  drugSearch: string;
  setDrugSearch: (v: string) => void;
  drugDialogOpen: boolean;
  setDrugDialogOpen: (v: boolean) => void;
  editingDrug: Drug | null;
  setEditingDrug: (v: Drug | null) => void;
  categories: { id: number; name: string }[];
  processConfigs: ProcessConfig[];
  newCategory: string;
  setNewCategory: (v: string) => void;
  apiProvider: "chembl" | "rxnorm" | "aifa" | "custom";
  setApiProvider: (v: "chembl" | "rxnorm" | "aifa" | "custom") => void;
  apiBaseUrl: string;
  setApiBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  savingApi: boolean;
  apiConfigOpen: boolean;
  setApiConfigOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  aifaStatus: { total: number; active: number; updated_at: string | null } | null;
  refreshingAifa: boolean;
  filteredDrugs: Drug[];
  handleSaveDrug: (data: Omit<Drug, "id">) => Promise<void>;
  handleDeleteDrug: (id: number) => Promise<void>;
  handleApproveDrug: (id: number) => Promise<void>;
  handleAddCategory: () => Promise<void>;
  handleDeleteCategory: (id: number) => Promise<void>;
  handleSaveApiConfig: () => Promise<void>;
  handleRefreshAifa: () => Promise<void>;
}

export function useFarmaciData(): UseFarmaciDataReturn {
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

  return {
    drugs,
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
    handleSaveDrug,
    handleDeleteDrug,
    handleApproveDrug,
    handleAddCategory,
    handleDeleteCategory,
    handleSaveApiConfig,
    handleRefreshAifa,
  };
}
