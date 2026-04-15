import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import React from "react";
import { preparations as initialPreparations, type Preparation, type Status, photoAssets } from "@/data/preparations";
import { extFetch } from "@/lib/apiClient";

export type RejectionReason = string;


function resolvePhoto(p: { type: string; label: string; assetKey?: string; barcode?: string }) {
  const url = photoAssets[p.assetKey as keyof typeof photoAssets] ?? "";
  return { type: p.type as Preparation["photos"][number]["type"], label: p.label, url, barcode: p.barcode };
}

/** Combina una data (YYYY-MM-DD) con un orario (HH:MM o HH:MM:SS) → "DD/MM/YYYY HH:MM" */

/** Formatta un timestamp ISO → "DD/MM/YYYY HH:MM" */
function formatTS(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
    dosageValue:      r.dosage_value    != null ? Number(r.dosage_value)    : null,
    dosageUnit:       r.dosage_unit     ?? null,
    specificGravity:  r.specific_gravity != null ? Number(r.specific_gravity) : null,
    date:             String(r.date).slice(0, 10),
    requestedAt:      formatTS(r.created_at),
    startedAt:        formatTS(r.started_at),
    finishedAt:       formatTS(r.finished_at),
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
    drugCategory:         r.drug_category           ?? null,
    drugCatalogId:          r.drug_catalog_id              ?? null,
    containerCatalogId:     r.container_catalog_id         ?? null,
    drugCatalogName:          r.drug_catalog_name            ?? null,
    drugCatalogNeedsReview:   r.drug_catalog_needs_review   ?? false,
    drugCatalogConcentration: r.drug_catalog_concentration  ?? null,
    drugCatalogVialVolume:    r.drug_catalog_vial_volume != null ? Number(r.drug_catalog_vial_volume) : null,
    containerCatalogName:     r.container_catalog_name      ?? null,
    currentProcessStepId: r.current_process_step_id ?? null,
    processStepOrder:     r.process_step_order != null ? Number(r.process_step_order) : null,
    processStepName:      r.process_step_name  ?? null,
    processStepCode:      r.process_step_code  ?? null,
    processStepsTotal:    r.process_steps_total != null ? Number(r.process_steps_total) : null,
  } as Preparation;
}

async function fetchPreparationsFromAPI(): Promise<Preparation[]> {
  const res = await extFetch("/preparations?limit=300");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
  return raw.map(mapPreparation);
}

export interface LocalValHistoryEntry {
  id: number;
  action: string;
  reason: string | null;
  actor_name: string | null;
  created_at: string;
}

interface PreparationsContextType {
  preparations: Preparation[];
  refreshPreparations: () => Promise<void>;
  validatePreparation: (id: string) => Promise<void>;
  rejectPreparation: (id: string, reason: RejectionReason) => Promise<void>;
  getRejectionReason: (id: string) => RejectionReason | undefined;
  undoPreparation: (id: string) => Promise<void>;
  reassignCappa: (prepId: string, cappaId: number | null, cappaName: string | null) => void;
  cappe: { id: number; name: string }[];
  barcodeMode: "detail" | "select";
  toggleBarcodeMode: () => void;
  barcodeSelectedIds: string[];
  addBarcodeSelection: (id: string) => void;
  clearBarcodeSelection: () => void;
  tableSelected: Set<string>;
  setTableSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  localValHistory: Record<string, LocalValHistoryEntry[]>;
}

const PreparationsContext = createContext<PreparationsContextType | null>(null);

export const usePreparations = () => {
  const ctx = useContext(PreparationsContext);
  if (!ctx) throw new Error("usePreparations must be used within PreparationsProvider");
  return ctx;
};

export const PreparationsProvider = ({ children }: { children: ReactNode }) => {
  const [preps, setPreps] = useState<Preparation[]>(initialPreparations);
  const [rejectionMap, setRejectionMap] = useState<Record<string, string>>({});
  const [previousStatusMap, setPreviousStatusMap] = useState<Record<string, Status>>({});
  const [localValHistory, setLocalValHistory] = useState<Record<string, LocalValHistoryEntry[]>>({});

  const appendLocalHistory = useCallback((id: string, action: string, reason: string | null = null) => {
    setLocalValHistory((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { id: -(Date.now()), action, reason, actor_name: null, created_at: new Date().toISOString() }],
    }));
  }, []);
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
      const map: Record<string, string> = {};
      data.forEach((p: any) => {
        if (p.rejectionReason) map[p.id] = p.rejectionReason;
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

  const validatePreparation = useCallback(async (id: string) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: "validata" as const } : p)));
    appendLocalHistory(id, "validata");
    try {
      const res = await extFetch(`/preparations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validation_status: "validata" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshPreparations();
    } catch {
      // Revert optimistic update on failure
      setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: null } : p)));
    }
  }, [refreshPreparations, appendLocalHistory]);

  const rejectPreparation = useCallback(async (id: string, reason: RejectionReason) => {
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: "rifiutata" as const } : p)));
    setRejectionMap((prev) => ({ ...prev, [id]: reason }));
    appendLocalHistory(id, "rifiutata", reason);
    try {
      const res = await extFetch(`/preparations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validation_status: "rifiutata", rejection_reason: reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshPreparations();
    } catch {
      // Revert optimistic update on failure
      setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: null } : p)));
      setRejectionMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  }, [refreshPreparations, appendLocalHistory]);

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

  const undoPreparation = useCallback(async (id: string) => {
    const prev_prep = preps.find((p) => p.id === id);
    setPreps((prev) => prev.map((p) => (p.id === id ? { ...p, validationStatus: null } : p)));
    setRejectionMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    appendLocalHistory(id, "annullata");
    try {
      const res = await extFetch(`/preparations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validation_status: null, rejection_reason: null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshPreparations();
    } catch {
      // Revert optimistic update on failure
      if (prev_prep) {
        setPreps((prev) => prev.map((p) => (p.id === id ? prev_prep : p)));
        if (prev_prep.rejectionReason) setRejectionMap((prev) => ({ ...prev, [id]: prev_prep.rejectionReason! }));
      }
    }
  }, [refreshPreparations, preps, appendLocalHistory]);

  return (
    <PreparationsContext.Provider value={{
      preparations: preps, refreshPreparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation,
      reassignCappa, cappe,
      barcodeMode, toggleBarcodeMode, barcodeSelectedIds, addBarcodeSelection, clearBarcodeSelection,
      tableSelected, setTableSelected,
      localValHistory,
    }}>
      {children}
    </PreparationsContext.Provider>
  );
};
