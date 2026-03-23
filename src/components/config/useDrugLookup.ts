import { useState, useEffect } from "react";
import { extFetch } from "@/lib/apiClient";

export interface LookupResult {
  name: string;
  code: string | null;
  aic_code?: string | null;
  category: string | null;
  description?: string | null;
  company?: string | null;
  source?: string;
}

export interface AicPresentation {
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

export interface MedicinaliData {
  denominazione: string;
  forma_farmaceutica: string;
  is_polvere: boolean;
  volume_ml: number | null;
  codice_atc: string | null;
  descrizione_atc: string | null;
  azienda: string;
  denominazione_package: string;
}

interface UseDrugLookupOptions {
  open: boolean;
  name: string;
  aicCode: string;
}

interface UseDrugLookupReturn {
  lookupResults: LookupResult[];
  lookupLoading: boolean;
  lookupError: string | null;
  aicPresentations: AicPresentation[];
  aicPresLoading: boolean;
  medicinaliData: MedicinaliData | null;
  medicinaliLoading: boolean;
  handleLookup: () => Promise<void>;
  clearLookupResults: () => void;
  clearLookupError: () => void;
}

export function useDrugLookup({ open, name, aicCode }: UseDrugLookupOptions): UseDrugLookupReturn {
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [aicPresentations, setAicPresentations] = useState<AicPresentation[]>([]);
  const [aicPresLoading, setAicPresLoading] = useState(false);
  const [medicinaliData, setMedicinaliData] = useState<MedicinaliData | null>(null);
  const [medicinaliLoading, setMedicinaliLoading] = useState(false);

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

  const clearLookupResults = () => setLookupResults([]);
  const clearLookupError = () => setLookupError(null);

  return {
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
  };
}
