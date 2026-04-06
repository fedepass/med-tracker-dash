import photoFlaconePolvere from "@/assets/photo-flacone-polvere.jpg";
import photoDiluente from "@/assets/photo-diluente-new.jpg";
import photoSaccaIV from "@/assets/photo-sacca-iv.jpg";
import photoSiringa from "@/assets/photo-siringa.jpg";
import photoPreparazioneFinale from "@/assets/photo-preparazione-finale.jpg";

export type Status = "completata" | "esecuzione" | "errore" | "attesa" | "corretta" | "warning_dosaggio" | "fallita";
export type ValidationStatus = "validata" | "rifiutata" | null;
export type Priority = "alta" | "media" | "bassa";

export interface ComponentPhoto {
  type: "farmaco" | "diluente" | "contenitore" | "preparazione";
  label: string;
  url: string;
  barcode?: string;
}

export interface LabelData {
  patientName: string;
  patientId: string;
  patientWard?: string;
  drug: string;
  dosage: string;
  route: string;
  volume: string;
  solvent: string;
  preparedBy: string;
  preparedAt: string;
  expiresAt: string;
  lotNumber: string;
  notes: string;
}

export interface Preparation {
  id: string;
  status: Status;
  validationStatus: ValidationStatus;
  rejectionReason?: string | null;
  previousStatus?: Status | null;
  hl7PrescriptionId?: string | null;
  priority: Priority;
  drug: string;
  form: string;
  dispensed: number;
  volumeValue: number | null;
  dosageValue?: number | null;
  dosageUnit?: string | null;
  specificGravity?: number | null;
  errorRate: number;
  executor: string | null;
  executorInitials: string | null;
  station: string | null;
  cappaId: number | null;
  date: string; // YYYY-MM-DD
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  photos: ComponentPhoto[];
  labelData: LabelData;
  drugCategory: string | null;
  drugCatalogId: number | null;
  containerCatalogId: number | null;
  drugCatalogName: string | null;
  drugCatalogNeedsReview: boolean;
  drugCatalogConcentration: string | null;
  drugCatalogVialVolume: number | null;
  containerCatalogName: string | null;
}

// Photo helpers for consistent usage
export const photoAssets = {
  flaconePolvere: photoFlaconePolvere,
  diluente: photoDiluente,
  saccaIV: photoSaccaIV,
  siringa: photoSiringa,
  preparazioneFinale: photoPreparazioneFinale,
};

export function ivPhotos(drug: string, diluent: string, barcode: string): ComponentPhoto[] {
  return [
    { type: "farmaco", label: `${drug} - Flacone polvere liofilizzata`, url: photoFlaconePolvere, barcode },
    { type: "diluente", label: diluent, url: photoDiluente, barcode: `80${barcode.slice(2)}` },
    { type: "contenitore", label: "Sacca IV per infusione", url: photoSaccaIV },
    { type: "preparazione", label: "Preparazione finale - Sacca IV pronta", url: photoPreparazioneFinale },
  ];
}

export function syringePhotos(drug: string, diluent: string, barcode: string): ComponentPhoto[] {
  return [
    { type: "farmaco", label: `${drug} - Flacone polvere liofilizzata`, url: photoFlaconePolvere, barcode },
    { type: "diluente", label: diluent, url: photoDiluente, barcode: `80${barcode.slice(2)}` },
    { type: "contenitore", label: "Siringa sterile per preparazione", url: photoSiringa },
    { type: "preparazione", label: "Preparazione finale - Siringa pronta", url: photoPreparazioneFinale },
  ];
}

export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
