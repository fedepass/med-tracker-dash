import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import React from "react";
import { preparations as initialPreparations, type Preparation, type Status, photoAssets } from "@/data/preparations";
import { extFetch } from "@/lib/apiClient";

export const rejectionReasons = [
  "Sovradosaggio",
  "Sottodosaggio",
  "Farmaco errato",
  "Contaminazione",
  "Contenitore errato",
  "Diluente errato",
  "Altro",
] as const;

export type RejectionReason = (typeof rejectionReasons)[number];


function resolvePhoto(p: { type: string; label: string; assetKey?: string; barcode?: string }) {
  const url = photoAssets[p.assetKey as keyof typeof photoAssets] ?? "";
  return { type: p.type as Preparation["photos"][number]["type"], label: p.label, url, barcode: p.barcode };
}

async function fetchPreparationsFromAPI(): Promise<Preparation[]> {
  const res = await extFetch("/preparations?limit=300");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // L'API esterna restituisce { data: [...], total, limit, offset }
  const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
  return raw.map((r) => ({
    ...r,
    // L'API esterna restituisce station come oggetto { id, name, tipologia }
    station: typeof r.station === "object" ? (r.station?.name ?? null) : r.station,
    photos: (r.photos ?? []).map(resolvePhoto),
  })) as Preparation[];
}

interface PreparationsContextType {
  preparations: Preparation[];
  refreshPreparations: () => Promise<void>;
  validatePreparation: (id: string) => void;
  rejectPreparation: (id: string, reason: RejectionReason) => void;
  getRejectionReason: (id: string) => RejectionReason | undefined;
  undoPreparation: (id: string) => void;
  barcodeMode: "detail" | "select";
  toggleBarcodeMode: () => void;
  barcodeSelectedIds: string[];
  addBarcodeSelection: (id: string) => void;
  clearBarcodeSelection: () => void;
  tableSelected: Set<string>;
  setTableSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const PreparationsContext = createContext<PreparationsContextType | null>(null);

export const usePreparations = () => {
  const ctx = useContext(PreparationsContext);
  if (!ctx) throw new Error("usePreparations must be used within PreparationsProvider");
  return ctx;
};

export const PreparationsProvider = ({ children }: { children: ReactNode }) => {
  const [preps, setPreps] = useState<Preparation[]>(initialPreparations);
  const [rejectionMap, setRejectionMap] = useState<Record<string, RejectionReason>>({});
  const [previousStatusMap, setPreviousStatusMap] = useState<Record<string, Status>>({});
  const [barcodeMode, setBarcodeMode] = useState<"detail" | "select">("detail");
  const [barcodeSelectedIds, setBarcodeSelectedIds] = useState<string[]>([]);
  const [tableSelected, setTableSelected] = useState<Set<string>>(new Set());

  const refreshPreparations = useCallback(async () => {
    try {
      const data = await fetchPreparationsFromAPI();
      setPreps(data);
    } catch {
      // fallback silenzioso: l'interfaccia mantiene i dati correnti
    }
  }, []);

  // Carica dal DB all'avvio
  useEffect(() => { refreshPreparations(); }, [refreshPreparations]);

  const toggleBarcodeMode = useCallback(() => {
    setBarcodeMode((m) => (m === "detail" ? "select" : "detail"));
    setBarcodeSelectedIds([]);
  }, []);

  const addBarcodeSelection = useCallback((id: string) => {
    setBarcodeSelectedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    setTableSelected((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  const clearBarcodeSelection = useCallback(() => {
    setBarcodeSelectedIds([]);
  }, []);

  const validatePreparation = useCallback((id: string) => {
    setPreps((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        setPreviousStatusMap((m) => ({ ...m, [id]: target.status }));
      }
      return prev.map((p) => (p.id === id ? { ...p, status: "validata" as const } : p));
    });
  }, []);

  const rejectPreparation = useCallback((id: string, reason: RejectionReason) => {
    setPreps((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        setPreviousStatusMap((m) => ({ ...m, [id]: target.status }));
      }
      return prev.map((p) => (p.id === id ? { ...p, status: "rifiutata" as const } : p));
    });
    setRejectionMap((prev) => ({ ...prev, [id]: reason }));
  }, []);

  const getRejectionReason = useCallback(
    (id: string) => rejectionMap[id],
    [rejectionMap]
  );

  const undoPreparation = useCallback((id: string) => {
    setPreps((prev) => {
      const previousStatus = previousStatusMap[id] ?? "completata";
      return prev.map((p) => (p.id === id ? { ...p, status: previousStatus } : p));
    });
    setRejectionMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPreviousStatusMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [previousStatusMap]);

  return (
    <PreparationsContext.Provider value={{
      preparations: preps, refreshPreparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation,
      barcodeMode, toggleBarcodeMode, barcodeSelectedIds, addBarcodeSelection, clearBarcodeSelection,
      tableSelected, setTableSelected,
    }}>
      {children}
    </PreparationsContext.Provider>
  );
};
