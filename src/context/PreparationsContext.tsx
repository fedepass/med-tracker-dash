import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { preparations as initialPreparations, type Preparation, type Status, type Priority } from "@/data/preparations";
import photoFarmaco from "@/assets/photo-farmaco.jpg";
import photoContenitore from "@/assets/photo-contenitore.jpg";

export const rejectionReasons = [
  "Sovradosaggio",
  "Sottodosaggio",
  "Farmaco errato",
  "Paziente errato",
  "Contaminazione",
  "Etichetta errata",
  "Contenitore errato",
  "Diluente errato",
  "Scadenza superata",
  "Altro",
] as const;

export type RejectionReason = (typeof rejectionReasons)[number];

const drugs = [
  { drug: "Paracetamolo 500mg", form: "Capsula" },
  { drug: "Ibuprofene 400mg", form: "Compressa" },
  { drug: "Amoxicillina 875mg", form: "Soluzione" },
  { drug: "Metformina 850mg", form: "Compressa" },
  { drug: "Omeprazolo 20mg", form: "Capsula" },
  { drug: "Ciprofloxacina 500mg", form: "Soluzione IV" },
  { drug: "Furosemide 40mg", form: "Compressa" },
  { drug: "Ceftriaxone 1g", form: "Soluzione IV" },
  { drug: "Desametasone 4mg", form: "Fiala" },
  { drug: "Morfina 10mg", form: "Fiala" },
  { drug: "Diclofenac 75mg", form: "Compressa" },
  { drug: "Ketoprofene 100mg", form: "Capsula" },
  { drug: "Vancomicina 500mg", form: "Soluzione IV" },
  { drug: "Insulina Glargine 100U", form: "Penna" },
  { drug: "Pantoprazolo 40mg", form: "Compressa" },
];

const containers = ["Contenitore A1", "Contenitore A5", "Contenitore B12", "Contenitore C3", "Contenitore D7", "Contenitore E2"];
const executors = [
  { name: "L. Bianchi", initials: "LB" },
  { name: "M. Rossi", initials: "MR" },
  { name: "A. Verdi", initials: "AV" },
  { name: "S. Ferrari", initials: "SF" },
  { name: "G. Romano", initials: "GR" },
];
const stations = ["Post. 1", "Post. 2", "Post. 3", "Post. 4"];
const statuses: Status[] = ["completata", "esecuzione", "attesa", "errore"];
const priorities: Priority[] = ["alta", "media", "bassa"];
const patients = [
  { name: "Mario Rossi", id: "PAZ-001" },
  { name: "Anna Bianchi", id: "PAZ-002" },
  { name: "Giuseppe Verdi", id: "PAZ-003" },
  { name: "Lucia Ferrari", id: "PAZ-004" },
  { name: "Paolo Romano", id: "PAZ-005" },
  { name: "Francesca Conti", id: "PAZ-006" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

function generatePreparation(counter: number): Preparation {
  const status = pick(statuses);
  const d = pick(drugs);
  const target = randBetween(10, 100);
  const dispensed = status === "attesa" ? 0 : status === "esecuzione" ? randBetween(0, target) : randBetween(target * 0.9, target * 1.05);
  const errorRate = status === "errore" ? randBetween(2.5, 8) : status === "attesa" ? 0 : randBetween(0, 2);
  const exec = status === "attesa" ? null : pick(executors);
  const hour = 7 + Math.floor(Math.random() * 10);
  const min = Math.floor(Math.random() * 60);
  const requestedAt = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  const startedAt = status === "attesa" ? null : `${String(hour).padStart(2, "0")}:${String(min + 10).padStart(2, "0")}`;
  const finishedAt = status === "completata" || status === "errore" ? `${String(hour + 1).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
  const patient = pick(patients);

  return {
    id: `RX-${3000 + counter}`,
    status,
    priority: pick(priorities),
    drug: d.drug,
    form: d.form,
    container: pick(containers),
    dispensed,
    target,
    errorRate,
    executor: exec?.name ?? null,
    executorInitials: exec?.initials ?? null,
    station: exec ? pick(stations) : null,
    requestedAt,
    startedAt,
    finishedAt,
    photos: [
      { type: "farmaco", label: `${d.drug} - Riconoscimento`, url: photoFarmaco, barcode: `80${String(Math.floor(Math.random() * 1e10)).padStart(11, "0")}` },
      { type: "contenitore", label: `${pick(containers)} - Sacca`, url: photoContenitore },
    ],
    supplementaryDoses: [],
    labelData: {
      patientName: patient.name,
      patientId: patient.id,
      drug: d.drug,
      dosage: `${randBetween(100, 1000)}mg`,
      route: pick(["EV", "Orale", "IM", "SC"]),
      volume: `${randBetween(50, 500)}ml`,
      preparedBy: exec?.name ?? "Non assegnato",
      preparedAt: `23/02/2026 ${requestedAt}`,
      expiresAt: "24/02/2026 08:00",
      lotNumber: `LOT-${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
      notes: "Preparazione standard",
    },
  };
}

interface PreparationsContextType {
  preparations: Preparation[];
  validatePreparation: (id: string) => void;
  rejectPreparation: (id: string, reason: RejectionReason) => void;
  getRejectionReason: (id: string) => RejectionReason | undefined;
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
  const counterRef = useRef(0);

  const validatePreparation = useCallback((id: string) => {
    setPreps((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: "validata" as const } : p));
      // Add a new preparation to replace the validated one
      counterRef.current += 1;
      return [...updated, generatePreparation(counterRef.current)];
    });
  }, []);

  const rejectPreparation = useCallback((id: string, reason: RejectionReason) => {
    setPreps((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: "rifiutata" as const } : p));
      counterRef.current += 1;
      return [...updated, generatePreparation(counterRef.current)];
    });
    setRejectionMap((prev) => ({ ...prev, [id]: reason }));
  }, []);

  const getRejectionReason = useCallback(
    (id: string) => rejectionMap[id],
    [rejectionMap]
  );

  return (
    <PreparationsContext.Provider value={{ preparations: preps, validatePreparation, rejectPreparation, getRejectionReason }}>
      {children}
    </PreparationsContext.Provider>
  );
};
