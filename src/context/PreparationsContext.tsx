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
  // L'API restituisce campi flat (snake_case). Supporta anche il vecchio formato annidato.
  const label = r.label ?? r.labelData ?? {};
  return {
    id:               String(r.id),
    status:           r.status,
    validationStatus: r.validation_status ?? r.validationStatus ?? null,
    rejectionReason:  r.rejection_reason  ?? r.rejectionReason  ?? null,
    previousStatus:   r.previous_status   ?? r.previousStatus   ?? null,
    priority:         r.priority,
    drug:             r.drug,
    form:             r.form      ?? "",
    dispensed:        Number(r.dispensed),
    volumeValue:      r.volume_value != null ? Number(r.volume_value) : null,
    errorRate:        Number(r.error_rate ?? r.errorRate ?? 0),
    date:             String(r.date).slice(0, 10),
    requestedAt:      r.requested_at != null ? String(r.requested_at).slice(0, 5) : (r.requestedAt ?? null),
    startedAt:        r.started_at  != null ? String(r.started_at).slice(0,  5)  : (r.startedAt  ?? null),
    finishedAt:       r.finished_at != null ? String(r.finished_at).slice(0,  5) : (r.finishedAt ?? null),
    hl7PrescriptionId: r.hl7_prescription_id ?? r.hl7PrescriptionId ?? null,
    // API piatta: executor_name/cappa_name; oppure oggetto annidato (formato legacy)
    executor:         r.executor_name ?? (typeof r.executor === "object" && r.executor !== null ? r.executor.name : r.executor) ?? null,
    executorInitials: r.executor_initials ?? (typeof r.executor === "object" && r.executor !== null ? r.executor.initials : r.executorInitials) ?? null,
    station:          r.cappa_name ?? (typeof r.station === "object" && r.station !== null ? r.station.name : r.station) ?? null,
    cappaId:          r.cappa_id   ?? null,
    labelData: {
      // Campi flat dall'API (priorità) poi fallback su oggetto label annidato
      patientId:   r.patient_id    ?? label.patient_id   ?? label.patientId   ?? "",
      patientName: r.patient_name  ?? label.patient_name ?? label.patientName ?? "",
      patientWard: r.patient_ward  ?? label.patient_ward ?? label.patientWard ?? "",
      drug:        label.drug      ?? r.drug ?? "",
      dosage:      r.dosage        ?? label.dosage       ?? "",
      route:       r.route         ?? label.route        ?? "",
      volume:      r.volume        ?? label.volume       ?? "",
      solvent:     r.solvent       ?? label.solvent      ?? "",
      preparedBy:  label.prepared_by  ?? label.preparedBy  ?? "",
      preparedAt:  label.prepared_at  ?? label.preparedAt  ?? "",
      expiresAt:   label.expires_at   ?? label.expiresAt   ?? "",
      lotNumber:   r.lot_number    ?? label.lot_number   ?? label.lotNumber   ?? "",
      notes:       r.notes         ?? label.notes        ?? "",
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
  reassignCappa: (prepId: string, cappaId: number | null, cappaName: string | null) => void;
  cappe: { id: number; name: string }[];
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
  const [cappe, setCappe] = useState<{ id: number; name: string }[]>([]);

  // Carica elenco cappe (per il select di riassegnazione)
  useEffect(() => {
    extFetch("/cappe").then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => setCappe(data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

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
      body: JSON.stringify({ validation_status: "validata" }),
    }).catch(() => {});
  }, []);

  const rejectPreparation = useCallback((id: string, reason: RejectionReason) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: "rifiutata" as const } : p)));
    setRejectionMap((prev) => ({ ...prev, [id]: reason }));
    extFetch(`/preparations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation_status: "rifiutata", rejection_reason: reason }),
    }).catch(() => {});
  }, []);

  const getRejectionReason = useCallback(
    (id: string) => rejectionMap[id],
    [rejectionMap]
  );

  const reassignCappa = useCallback((prepId: string, cappaId: number | null, cappaName: string | null) => {
    setPreps((prev) => prev.map((p) => p.id === prepId ? { ...p, cappaId, station: cappaName } : p));
    extFetch(`/preparations/${prepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cappa_id: cappaId }),
    }).catch(() => {});
  }, []);

  const undoPreparation = useCallback((id: string) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: null } : p)));
    setRejectionMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    extFetch(`/preparations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation_status: null, rejection_reason: null }),
    }).catch(() => {});
  }, []);

  return (
    <PreparationsContext.Provider value={{
      preparations: preps, refreshPreparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation,
      reassignCappa, cappe,
      barcodeMode, toggleBarcodeMode, barcodeSelectedIds, addBarcodeSelection, clearBarcodeSelection,
      tableSelected, setTableSelected,
    }}>
      {children}
    </PreparationsContext.Provider>
  );
};
