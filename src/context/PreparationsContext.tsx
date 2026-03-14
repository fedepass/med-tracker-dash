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

function mapPreparation(r: any): Preparation {
  // Supporta sia il vecchio formato camelCase sia il nuovo snake_case
  const isSnake = "validation_status" in r || "error_rate" in r;
  const label = r.label ?? r.labelData ?? {};
  return {
    id:               String(r.id),
    status:           r.status,
    validationStatus: (isSnake ? r.validation_status : r.validationStatus) ?? null,
    rejectionReason:  (isSnake ? r.rejection_reason  : r.rejectionReason)  ?? null,
    previousStatus:   (isSnake ? r.previous_status   : r.previousStatus)   ?? null,
    priority:         r.priority,
    prepType:         (isSnake ? r.prep_type          : r.prepType)         ?? "",
    drug:             r.drug,
    form:             r.form      ?? "",
    container:        r.container ?? "",
    dispensed:        Number(r.dispensed),
    target:           Number(r.target),
    errorRate:        Number(isSnake ? r.error_rate : r.errorRate),
    date:             String(r.date).slice(0, 10),
    requestedAt:      r.requested_at != null ? String(r.requested_at).slice(0, 5) : (r.requestedAt ?? null),
    startedAt:        r.started_at  != null ? String(r.started_at).slice(0,  5)  : (r.startedAt  ?? null),
    finishedAt:       r.finished_at != null ? String(r.finished_at).slice(0,  5) : (r.finishedAt ?? null),
    hl7PrescriptionId: (isSnake ? r.hl7_prescription_id : r.hl7PrescriptionId) ?? null,
    executor:         typeof r.executor === "object" && r.executor !== null
                        ? (r.executor.name ?? null)
                        : (r.executor ?? null),
    executorInitials: typeof r.executor === "object" && r.executor !== null
                        ? (r.executor.initials ?? null)
                        : (r.executorInitials ?? null),
    station:          typeof r.station === "object" && r.station !== null
                        ? (r.station.name ?? null)
                        : (r.station ?? null),
    labelData: {
      patientId:   label.patient_id   ?? label.patientId   ?? "",
      patientName: label.patient_name ?? label.patientName ?? "",
      patientWard: label.patient_ward ?? label.patientWard ?? "",
      drug:        label.drug         ?? r.drug,
      dosage:      label.dosage       ?? "",
      route:       label.route        ?? "",
      volume:      label.volume       ?? "",
      preparedBy:  label.prepared_by  ?? label.preparedBy  ?? "",
      preparedAt:  label.prepared_at  ?? label.preparedAt  ?? "",
      expiresAt:   label.expires_at   ?? label.expiresAt   ?? "",
      lotNumber:   label.lot_number   ?? label.lotNumber   ?? "",
      notes:       label.notes        ?? "",
    },
    photos: (r.photos ?? []).map(resolvePhoto),
    supplementaryDoses: (r.supplementary_doses ?? r.supplementaryDoses ?? []).map((d: any) => ({
      time:   String(d.dose_time ?? d.time ?? "").slice(0, 5),
      amount: Number(d.amount),
      unit:   d.unit   ?? "",
      reason: d.reason ?? "",
    })),
  } as Preparation;
}

async function fetchPreparationsFromAPI(): Promise<Preparation[]> {
  const res = await extFetch("/preparations?limit=300");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
  return raw.map(mapPreparation);
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
      // Ripristina i motivi di rifiuto dal DB
      const map: Record<string, RejectionReason> = {};
      data.forEach((p: any) => {
        if (p.rejectionReason) map[p.id] = p.rejectionReason as RejectionReason;
      });
      setRejectionMap(map);
    } catch {
      // fallback silenzioso: l'interfaccia mantiene i dati correnti
    }
  }, []);

  // Carica dal DB all'avvio, poi polling ogni 30 secondi
  useEffect(() => {
    refreshPreparations();
    const interval = setInterval(refreshPreparations, 30_000);
    return () => clearInterval(interval);
  }, [refreshPreparations]);

  // Refresh quando la finestra torna in focus (tab switching, Alt+Tab)
  useEffect(() => {
    const onFocus = () => refreshPreparations();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPreparations]);

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
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: "validata" as const } : p)));
    extFetch(`/preparations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationStatus: "validata" }),
    }).catch(() => {});
  }, []);

  const rejectPreparation = useCallback((id: string, reason: RejectionReason) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: "rifiutata" as const } : p)));
    setRejectionMap((prev) => ({ ...prev, [id]: reason }));
    extFetch(`/preparations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationStatus: "rifiutata", rejectionReason: reason }),
    }).catch(() => {});
  }, []);

  const getRejectionReason = useCallback(
    (id: string) => rejectionMap[id],
    [rejectionMap]
  );

  const undoPreparation = useCallback((id: string) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: null } : p)));
    setRejectionMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    extFetch(`/preparations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationStatus: null, rejectionReason: null }),
    }).catch(() => {});
  }, []);

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
