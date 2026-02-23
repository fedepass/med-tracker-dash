import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { preparations as initialPreparations, type Preparation } from "@/data/preparations";

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

  const validatePreparation = useCallback((id: string) => {
    setPreps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "validata" as const } : p))
    );
  }, []);

  const rejectPreparation = useCallback((id: string, reason: RejectionReason) => {
    setPreps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rifiutata" as const } : p))
    );
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
