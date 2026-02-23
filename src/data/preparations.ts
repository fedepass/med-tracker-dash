import photoFlaconePolvere from "@/assets/photo-flacone-polvere.jpg";
import photoDiluente from "@/assets/photo-diluente-new.jpg";
import photoSaccaIV from "@/assets/photo-sacca-iv.jpg";
import photoSiringa from "@/assets/photo-siringa.jpg";
import photoPreparazioneFinale from "@/assets/photo-preparazione-finale.jpg";

export type Status = "completata" | "esecuzione" | "errore" | "attesa" | "validata" | "rifiutata";
export type Priority = "alta" | "media" | "bassa";

export type PrepType = "infusione_iv" | "siringa_ricostituita";

export interface ComponentPhoto {
  type: "farmaco" | "diluente" | "contenitore" | "preparazione";
  label: string;
  url: string;
  barcode?: string;
}

export interface SupplementaryDose {
  time: string;
  amount: number;
  unit: string;
  reason: string;
}

export interface LabelData {
  patientName: string;
  patientId: string;
  drug: string;
  dosage: string;
  route: string;
  volume: string;
  preparedBy: string;
  preparedAt: string;
  expiresAt: string;
  lotNumber: string;
  notes: string;
}

export interface Preparation {
  id: string;
  status: Status;
  priority: Priority;
  prepType: PrepType;
  drug: string;
  form: string;
  container: string;
  dispensed: number;
  target: number;
  errorRate: number;
  executor: string | null;
  executorInitials: string | null;
  station: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  photos: ComponentPhoto[];
  supplementaryDoses: SupplementaryDose[];
  labelData: LabelData;
}

// Photo helpers for consistent usage
export const photoAssets = {
  flaconePolvere: photoFlaconePolvere,
  diluente: photoDiluente,
  saccaIV: photoSaccaIV,
  siringa: photoSiringa,
  preparazioneFinale: photoPreparazioneFinale,
};

function ivPhotos(drug: string, diluent: string, barcode: string): ComponentPhoto[] {
  return [
    { type: "farmaco", label: `${drug} - Flacone polvere liofilizzata`, url: photoFlaconePolvere, barcode },
    { type: "diluente", label: diluent, url: photoDiluente, barcode: `80${barcode.slice(2)}` },
    { type: "contenitore", label: "Sacca IV per infusione", url: photoSaccaIV },
    { type: "preparazione", label: "Preparazione finale - Sacca IV pronta", url: photoPreparazioneFinale },
  ];
}

function syringePhotos(drug: string, diluent: string, barcode: string): ComponentPhoto[] {
  return [
    { type: "farmaco", label: `${drug} - Flacone polvere liofilizzata`, url: photoFlaconePolvere, barcode },
    { type: "diluente", label: diluent, url: photoDiluente, barcode: `80${barcode.slice(2)}` },
    { type: "contenitore", label: "Siringa sterile per preparazione", url: photoSiringa },
    { type: "preparazione", label: "Preparazione finale - Siringa pronta", url: photoPreparazioneFinale },
  ];
}

export const preparations: Preparation[] = [
  {
    id: "RX-2847",
    status: "completata",
    priority: "alta",
    prepType: "infusione_iv",
    drug: "Ceftriaxone 2g",
    form: "Polvere per soluzione per infusione",
    container: "Sacca NaCl 0.9% 100ml",
    dispensed: 100.2,
    target: 100.0,
    errorRate: 0.2,
    executor: "L. Bianchi",
    executorInitials: "LB",
    station: "Cappa 1",
    requestedAt: "08:30",
    startedAt: "08:45",
    finishedAt: "09:12",
    photos: ivPhotos("Ceftriaxone 2g", "Soluzione Fisiologica NaCl 0.9% 100ml", "8012345678901"),
    supplementaryDoses: [
      { time: "08:55", amount: 0.5, unit: "ml", reason: "Compensazione volume residuo nel flacone" },
    ],
    labelData: {
      patientName: "Mario Rossi",
      patientId: "PAZ-20240315-001",
      drug: "Ceftriaxone 2g in NaCl 0.9%",
      dosage: "2 g",
      route: "Endovenosa",
      volume: "100 ml",
      preparedBy: "L. Bianchi",
      preparedAt: "23/02/2026 09:12",
      expiresAt: "24/02/2026 09:12",
      lotNumber: "LOT-2026-02-2847",
      notes: "Infondere in 30 minuti. Conservare a 2-8°C se non somministrata entro 6h.",
    },
  },
  {
    id: "RX-2846",
    status: "esecuzione",
    priority: "media",
    prepType: "siringa_ricostituita",
    drug: "Vancomicina 1g",
    form: "Polvere per soluzione iniettabile",
    container: "Siringa 50ml",
    dispensed: 38.5,
    target: 50.0,
    errorRate: 0,
    executor: "M. Verdi",
    executorInitials: "MV",
    station: "Cappa 2",
    requestedAt: "09:15",
    startedAt: "09:30",
    finishedAt: null,
    photos: syringePhotos("Vancomicina 1g", "Acqua per preparazioni iniettabili 20ml", "8011122233344").slice(0, 2),
    supplementaryDoses: [],
    labelData: {
      patientName: "Anna Verdi",
      patientId: "PAZ-20240315-002",
      drug: "Vancomicina 1g ricostituita in Acqua PPI",
      dosage: "1 g",
      route: "Endovenosa lenta",
      volume: "50 ml",
      preparedBy: "M. Verdi",
      preparedAt: "In corso",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2846",
      notes: "Infondere in almeno 60 minuti. Monitorare per Red Man Syndrome.",
    },
  },
  {
    id: "RX-2845",
    status: "errore",
    priority: "alta",
    prepType: "infusione_iv",
    drug: "Meropenem 1g",
    form: "Polvere per soluzione per infusione",
    container: "Sacca NaCl 0.9% 50ml",
    dispensed: 53.8,
    target: 50.0,
    errorRate: 7.6,
    executor: "G. Neri",
    executorInitials: "GN",
    station: "Cappa 3",
    requestedAt: "08:00",
    startedAt: "08:20",
    finishedAt: "08:45",
    photos: ivPhotos("Meropenem 1g", "Soluzione Fisiologica NaCl 0.9% 50ml", "8055566677788"),
    supplementaryDoses: [
      { time: "08:30", amount: 2.0, unit: "ml", reason: "Errore: volume eccessivo ricostituito - superamento soglia" },
      { time: "08:38", amount: 1.8, unit: "ml", reason: "Tentativo correzione dosaggio - non riuscito" },
    ],
    labelData: {
      patientName: "Luigi Bianchi",
      patientId: "PAZ-20240315-003",
      drug: "Meropenem 1g in NaCl 0.9%",
      dosage: "1 g",
      route: "Endovenosa",
      volume: "50 ml",
      preparedBy: "G. Neri",
      preparedAt: "23/02/2026 08:45",
      expiresAt: "23/02/2026 14:45",
      lotNumber: "LOT-2026-02-2845",
      notes: "ATTENZIONE: Errore volume rilevato. Preparazione da rifare.",
    },
  },
  {
    id: "RX-2844",
    status: "attesa",
    priority: "bassa",
    prepType: "siringa_ricostituita",
    drug: "Pantoprazolo 40mg",
    form: "Polvere per soluzione iniettabile",
    container: "Siringa 10ml",
    dispensed: 0,
    target: 10.0,
    errorRate: 0,
    executor: null,
    executorInitials: null,
    station: null,
    requestedAt: "10:00",
    startedAt: null,
    finishedAt: null,
    photos: [],
    supplementaryDoses: [],
    labelData: {
      patientName: "Francesca Neri",
      patientId: "PAZ-20240315-004",
      drug: "Pantoprazolo 40mg ricostituito in NaCl 0.9%",
      dosage: "40 mg",
      route: "Endovenosa",
      volume: "10 ml",
      preparedBy: "—",
      preparedAt: "In attesa",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2844",
      notes: "Ricostituire con 10ml NaCl 0.9%. Somministrare in bolo lento (2-15 min).",
    },
  },
  {
    id: "RX-2843",
    status: "completata",
    priority: "media",
    prepType: "infusione_iv",
    drug: "Piperacillina/Tazobactam 4.5g",
    form: "Polvere per soluzione per infusione",
    container: "Sacca NaCl 0.9% 100ml",
    dispensed: 100.0,
    target: 100.0,
    errorRate: 0.0,
    executor: "L. Bianchi",
    executorInitials: "LB",
    station: "Cappa 1",
    requestedAt: "07:45",
    startedAt: "08:00",
    finishedAt: "08:28",
    photos: ivPhotos("Piperacillina/Tazobactam 4.5g", "Soluzione Fisiologica NaCl 0.9% 100ml", "8033344455566"),
    supplementaryDoses: [],
    labelData: {
      patientName: "Giuseppe Esposito",
      patientId: "PAZ-20240315-005",
      drug: "Piperacillina/Tazobactam 4.5g in NaCl 0.9%",
      dosage: "4.5 g",
      route: "Endovenosa",
      volume: "100 ml",
      preparedBy: "L. Bianchi",
      preparedAt: "23/02/2026 08:28",
      expiresAt: "24/02/2026 08:28",
      lotNumber: "LOT-2026-02-2843",
      notes: "Infondere in 30 minuti. Stabilità 24h a temperatura ambiente.",
    },
  },
  {
    id: "RX-2842",
    status: "completata",
    priority: "alta",
    prepType: "siringa_ricostituita",
    drug: "Ampicillina 1g",
    form: "Polvere per soluzione iniettabile",
    container: "Siringa 20ml",
    dispensed: 20.1,
    target: 20.0,
    errorRate: 0.5,
    executor: "S. Ferrari",
    executorInitials: "SF",
    station: "Cappa 2",
    requestedAt: "07:30",
    startedAt: "07:40",
    finishedAt: "07:55",
    photos: syringePhotos("Ampicillina 1g", "Acqua per preparazioni iniettabili 20ml", "8044455566677"),
    supplementaryDoses: [],
    labelData: {
      patientName: "Clara Moretti",
      patientId: "PAZ-20240315-006",
      drug: "Ampicillina 1g ricostituita in Acqua PPI",
      dosage: "1 g",
      route: "Endovenosa",
      volume: "20 ml",
      preparedBy: "S. Ferrari",
      preparedAt: "23/02/2026 07:55",
      expiresAt: "23/02/2026 13:55",
      lotNumber: "LOT-2026-02-2842",
      notes: "Somministrare in bolo lento (3-5 min). Utilizzare entro 6h.",
    },
  },
  {
    id: "RX-2841",
    status: "esecuzione",
    priority: "alta",
    prepType: "infusione_iv",
    drug: "Amoxicillina/Ac. Clavulanico 2.2g",
    form: "Polvere per soluzione per infusione",
    container: "Sacca NaCl 0.9% 100ml",
    dispensed: 65.0,
    target: 100.0,
    errorRate: 0,
    executor: "G. Neri",
    executorInitials: "GN",
    station: "Cappa 3",
    requestedAt: "09:00",
    startedAt: "09:15",
    finishedAt: null,
    photos: ivPhotos("Amoxicillina/Ac. Clavulanico 2.2g", "Soluzione Fisiologica NaCl 0.9% 100ml", "8066677788899").slice(0, 2),
    supplementaryDoses: [],
    labelData: {
      patientName: "Roberto Colombo",
      patientId: "PAZ-20240315-007",
      drug: "Amoxicillina/Ac. Clavulanico 2.2g in NaCl 0.9%",
      dosage: "2.2 g",
      route: "Endovenosa",
      volume: "100 ml",
      preparedBy: "G. Neri",
      preparedAt: "In corso",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2841",
      notes: "Infondere in 30 minuti. Utilizzare immediatamente dopo ricostituzione.",
    },
  },
  {
    id: "RX-2840",
    status: "attesa",
    priority: "media",
    prepType: "infusione_iv",
    drug: "Ciprofloxacina 400mg",
    form: "Soluzione per infusione",
    container: "Sacca Glucosio 5% 200ml",
    dispensed: 0,
    target: 200.0,
    errorRate: 0,
    executor: null,
    executorInitials: null,
    station: null,
    requestedAt: "10:30",
    startedAt: null,
    finishedAt: null,
    photos: [],
    supplementaryDoses: [],
    labelData: {
      patientName: "Elena Ricci",
      patientId: "PAZ-20240315-008",
      drug: "Ciprofloxacina 400mg in Glucosio 5%",
      dosage: "400 mg",
      route: "Endovenosa",
      volume: "200 ml",
      preparedBy: "—",
      preparedAt: "In attesa",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2840",
      notes: "Infondere in 60 minuti. Proteggere dalla luce.",
    },
  },
  {
    id: "RX-2839",
    status: "completata",
    priority: "bassa",
    prepType: "siringa_ricostituita",
    drug: "Desametasone 8mg",
    form: "Soluzione iniettabile",
    container: "Siringa 5ml",
    dispensed: 5.0,
    target: 5.0,
    errorRate: 0.0,
    executor: "M. Verdi",
    executorInitials: "MV",
    station: "Cappa 2",
    requestedAt: "08:15",
    startedAt: "08:20",
    finishedAt: "08:30",
    photos: syringePhotos("Desametasone 8mg", "NaCl 0.9% 3ml", "8077788899900"),
    supplementaryDoses: [],
    labelData: {
      patientName: "Marco Fontana",
      patientId: "PAZ-20240315-009",
      drug: "Desametasone 8mg diluito in NaCl 0.9%",
      dosage: "8 mg",
      route: "Endovenosa",
      volume: "5 ml",
      preparedBy: "M. Verdi",
      preparedAt: "23/02/2026 08:30",
      expiresAt: "23/02/2026 20:30",
      lotNumber: "LOT-2026-02-2839",
      notes: "Somministrare in bolo lento. Stabile 12h a temperatura ambiente.",
    },
  },
  {
    id: "RX-2838",
    status: "errore",
    priority: "media",
    prepType: "infusione_iv",
    drug: "Teicoplanina 400mg",
    form: "Polvere per soluzione per infusione",
    container: "Sacca NaCl 0.9% 100ml",
    dispensed: 105.5,
    target: 100.0,
    errorRate: 5.5,
    executor: "S. Ferrari",
    executorInitials: "SF",
    station: "Cappa 1",
    requestedAt: "08:45",
    startedAt: "09:00",
    finishedAt: "09:25",
    photos: ivPhotos("Teicoplanina 400mg", "Acqua per preparazioni iniettabili 3ml + NaCl 0.9% 100ml", "8088899900011"),
    supplementaryDoses: [
      { time: "09:10", amount: 3.0, unit: "ml", reason: "Volume ricostituzione eccessivo - contaminazione" },
    ],
    labelData: {
      patientName: "Silvia Greco",
      patientId: "PAZ-20240315-010",
      drug: "Teicoplanina 400mg in NaCl 0.9%",
      dosage: "400 mg",
      route: "Endovenosa",
      volume: "100 ml",
      preparedBy: "S. Ferrari",
      preparedAt: "23/02/2026 09:25",
      expiresAt: "23/02/2026 15:25",
      lotNumber: "LOT-2026-02-2838",
      notes: "ATTENZIONE: Volume non conforme. Ripreparare.",
    },
  },
];
