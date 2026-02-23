import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { preparations as initialPreparations, type Preparation, type Status, type Priority, type PrepType, photoAssets } from "@/data/preparations";

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

interface DrugDef {
  drug: string;
  form: string;
  prepType: PrepType;
  container: string;
  diluent: string;
  volume: number;
  route: string;
}

const drugDefs: DrugDef[] = [
  { drug: "Ceftriaxone 2g", form: "Polvere per soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "Soluzione Fisiologica NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Vancomicina 1g", form: "Polvere per soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 50ml", diluent: "Acqua per preparazioni iniettabili 20ml", volume: 50, route: "Endovenosa lenta" },
  { drug: "Meropenem 1g", form: "Polvere per soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 50ml", diluent: "Soluzione Fisiologica NaCl 0.9% 50ml", volume: 50, route: "Endovenosa" },
  { drug: "Piperacillina/Tazobactam 4.5g", form: "Polvere per soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "Soluzione Fisiologica NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Ampicillina 1g", form: "Polvere per soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 20ml", diluent: "Acqua per preparazioni iniettabili 20ml", volume: 20, route: "Endovenosa" },
  { drug: "Amoxicillina/Ac. Clavulanico 2.2g", form: "Polvere per soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "Soluzione Fisiologica NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Pantoprazolo 40mg", form: "Polvere per soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 10ml", diluent: "NaCl 0.9% 10ml", volume: 10, route: "Endovenosa" },
  { drug: "Teicoplanina 400mg", form: "Polvere per soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "Acqua PPI 3ml + NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Desametasone 8mg", form: "Soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 5ml", diluent: "NaCl 0.9% 3ml", volume: 5, route: "Endovenosa" },
  { drug: "Ciprofloxacina 400mg", form: "Soluzione per infusione", prepType: "infusione_iv", container: "Sacca Glucosio 5% 200ml", diluent: "Glucosio 5% 200ml", volume: 200, route: "Endovenosa" },
  { drug: "Metronidazolo 500mg", form: "Soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Fluconazolo 200mg", form: "Soluzione per infusione", prepType: "infusione_iv", container: "Sacca NaCl 0.9% 100ml", diluent: "NaCl 0.9% 100ml", volume: 100, route: "Endovenosa" },
  { drug: "Morfina 10mg", form: "Soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 10ml", diluent: "NaCl 0.9% 9ml", volume: 10, route: "Endovenosa lenta" },
  { drug: "Furosemide 20mg", form: "Soluzione iniettabile", prepType: "siringa_ricostituita", container: "Siringa 5ml", diluent: "NaCl 0.9%", volume: 5, route: "Endovenosa" },
];

const executors = [
  { name: "L. Bianchi", initials: "LB" },
  { name: "M. Rossi", initials: "MR" },
  { name: "A. Verdi", initials: "AV" },
  { name: "S. Ferrari", initials: "SF" },
  { name: "G. Romano", initials: "GR" },
];
const stations = ["Cappa 1", "Cappa 2", "Cappa 3", "Cappa 4"];
const statuses: Status[] = ["completata", "esecuzione", "attesa", "errore"];
const priorities: Priority[] = ["alta", "media", "bassa"];
const patients = [
  { name: "Mario Rossi", id: "PAZ-001" },
  { name: "Anna Bianchi", id: "PAZ-002" },
  { name: "Giuseppe Verdi", id: "PAZ-003" },
  { name: "Lucia Ferrari", id: "PAZ-004" },
  { name: "Paolo Romano", id: "PAZ-005" },
  { name: "Francesca Conti", id: "PAZ-006" },
  { name: "Roberto Colombo", id: "PAZ-007" },
  { name: "Elena Ricci", id: "PAZ-008" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

function generatePreparation(counter: number): Preparation {
  const status = pick(statuses);
  const d = pick(drugDefs);
  const target = d.volume;
  const dispensed = status === "attesa" ? 0 : status === "esecuzione" ? randBetween(0, target) : randBetween(target * 0.95, target * 1.05);
  const errorRate = status === "errore" ? randBetween(2.5, 8) : status === "attesa" ? 0 : randBetween(0, 1.5);
  const exec = status === "attesa" ? null : pick(executors);
  const hour = 7 + Math.floor(Math.random() * 10);
  const min = Math.floor(Math.random() * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  const requestedAt = `${pad(hour)}:${pad(min)}`;
  // Randomly assign today or yesterday
  const now = new Date();
  const dayOffset = Math.random() < 0.7 ? 0 : -1;
  const dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const date = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  const startedAt = status === "attesa" ? null : `${pad(hour)}:${pad(Math.min(min + 10, 59))}`;
  const finishedAt = status === "completata" || status === "errore" ? `${pad(hour + 1)}:${pad(min)}` : null;
  const patient = pick(patients);
  const barcode = `80${String(Math.floor(Math.random() * 1e10)).padStart(11, "0")}`;

  const isIV = d.prepType === "infusione_iv";
  const allPhotos = [
    { type: "farmaco" as const, label: `${d.drug} - Flacone polvere liofilizzata`, url: photoAssets.flaconePolvere, barcode },
    { type: "diluente" as const, label: d.diluent, url: photoAssets.diluente, barcode: `80${barcode.slice(2)}` },
    { type: "contenitore" as const, label: isIV ? "Sacca IV per infusione" : "Siringa sterile per preparazione", url: isIV ? photoAssets.saccaIV : photoAssets.siringa },
    { type: "preparazione" as const, label: isIV ? "Preparazione finale - Sacca IV pronta" : "Preparazione finale - Siringa pronta", url: photoAssets.preparazioneFinale },
  ];

  // Photos based on status: attesa=none, esecuzione=first 2, completata/errore=all
  const photos = status === "attesa" ? [] : status === "esecuzione" ? allPhotos.slice(0, 2) : allPhotos;

  return {
    id: `RX-${3000 + counter}`,
    status,
    priority: pick(priorities),
    prepType: d.prepType,
    drug: d.drug,
    form: d.form,
    container: d.container,
    dispensed,
    target,
    errorRate,
    executor: exec?.name ?? null,
    executorInitials: exec?.initials ?? null,
    station: exec ? pick(stations) : null,
    date,
    requestedAt,
    startedAt,
    finishedAt,
    photos,
    supplementaryDoses: [],
    labelData: {
      patientName: patient.name,
      patientId: patient.id,
      drug: `${d.drug} in ${d.diluent.split(" ").slice(0, 3).join(" ")}`,
      dosage: d.drug.split(" ").pop() ?? "",
      route: d.route,
      volume: `${target} ml`,
      preparedBy: exec?.name ?? "Non assegnato",
      preparedAt: finishedAt ? `23/02/2026 ${finishedAt}` : "In corso",
      expiresAt: "24/02/2026 08:00",
      lotNumber: `LOT-${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
      notes: isIV ? `Infondere in ${target >= 100 ? 30 : 15} minuti.` : "Somministrare in bolo lento.",
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
