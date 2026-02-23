export type Status = "completata" | "esecuzione" | "errore" | "attesa";
export type Priority = "alta" | "media" | "bassa";

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

export const preparations: Preparation[] = [
  {
    id: "RX-2847",
    status: "completata",
    priority: "alta",
    drug: "Paracetamolo 500mg",
    form: "Capsula",
    container: "Contenitore B12",
    dispensed: 45.2,
    target: 45.0,
    errorRate: 0.4,
    executor: "L. Bianchi",
    executorInitials: "LB",
    station: "Post. 1",
    requestedAt: "08:30",
    startedAt: "08:45",
    finishedAt: "09:12",
    photos: [
      { type: "farmaco", label: "Paracetamolo 500mg - Riconoscimento", url: "/placeholder.svg", barcode: "8012345678901" },
      { type: "diluente", label: "Soluzione Fisiologica NaCl 0.9%", url: "/placeholder.svg", barcode: "8098765432101" },
      { type: "contenitore", label: "Contenitore B12 - Sacca 250ml", url: "/placeholder.svg" },
      { type: "preparazione", label: "Preparazione Finale", url: "/placeholder.svg" },
    ],
    supplementaryDoses: [
      { time: "08:55", amount: 0.2, unit: "g", reason: "Compensazione perdita trasferimento" },
    ],
    labelData: {
      patientName: "Mario Rossi",
      patientId: "PAZ-20240315-001",
      drug: "Paracetamolo 500mg in NaCl 0.9%",
      dosage: "500 mg",
      route: "Endovenosa",
      volume: "250 ml",
      preparedBy: "L. Bianchi",
      preparedAt: "23/02/2026 09:12",
      expiresAt: "24/02/2026 09:12",
      lotNumber: "LOT-2026-02-2847",
      notes: "Somministrare in 30 minuti. Conservare a 2-8°C.",
    },
  },
  {
    id: "RX-2846",
    status: "esecuzione",
    priority: "media",
    drug: "Ibuprofene 400mg",
    form: "Compressa",
    container: "Contenitore A5",
    dispensed: 28.5,
    target: 30.0,
    errorRate: 0,
    executor: "M. Verdi",
    executorInitials: "MV",
    station: "Post. 2",
    requestedAt: "09:15",
    startedAt: "09:30",
    finishedAt: null,
    photos: [
      { type: "farmaco", label: "Ibuprofene 400mg - Riconoscimento", url: "/placeholder.svg", barcode: "8011122233344" },
      { type: "contenitore", label: "Contenitore A5 - Flacone", url: "/placeholder.svg" },
    ],
    supplementaryDoses: [],
    labelData: {
      patientName: "Anna Verdi",
      patientId: "PAZ-20240315-002",
      drug: "Ibuprofene 400mg",
      dosage: "400 mg",
      route: "Orale",
      volume: "—",
      preparedBy: "M. Verdi",
      preparedAt: "In corso",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2846",
      notes: "Assumere dopo i pasti.",
    },
  },
  {
    id: "RX-2845",
    status: "errore",
    priority: "alta",
    drug: "Amoxicillina 875mg",
    form: "Capsula",
    container: "Contenitore C3",
    dispensed: 52.8,
    target: 50.0,
    errorRate: 5.6,
    executor: "G. Neri",
    executorInitials: "GN",
    station: "Post. 3",
    requestedAt: "08:00",
    startedAt: "08:20",
    finishedAt: "08:45",
    photos: [
      { type: "farmaco", label: "Amoxicillina 875mg - Riconoscimento", url: "/placeholder.svg", barcode: "8055566677788" },
      { type: "diluente", label: "Acqua per preparazioni iniettabili", url: "/placeholder.svg", barcode: "8099988877766" },
      { type: "contenitore", label: "Contenitore C3 - Siringa 50ml", url: "/placeholder.svg" },
      { type: "preparazione", label: "Preparazione Finale - ERRORE", url: "/placeholder.svg" },
    ],
    supplementaryDoses: [
      { time: "08:30", amount: 1.5, unit: "g", reason: "Primo aggiustamento dosaggio" },
      { time: "08:38", amount: 1.3, unit: "g", reason: "Secondo aggiustamento - superamento soglia" },
    ],
    labelData: {
      patientName: "Luigi Bianchi",
      patientId: "PAZ-20240315-003",
      drug: "Amoxicillina 875mg in Acqua PPI",
      dosage: "875 mg",
      route: "Endovenosa",
      volume: "50 ml",
      preparedBy: "G. Neri",
      preparedAt: "23/02/2026 08:45",
      expiresAt: "23/02/2026 14:45",
      lotNumber: "LOT-2026-02-2845",
      notes: "ATTENZIONE: Errore quantità rilevato. Verifica necessaria.",
    },
  },
  {
    id: "RX-2844",
    status: "attesa",
    priority: "bassa",
    drug: "Omeprazolo 20mg",
    form: "Capsula",
    container: "Contenitore D7",
    dispensed: 0,
    target: 35.0,
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
      drug: "Omeprazolo 20mg",
      dosage: "20 mg",
      route: "Orale",
      volume: "—",
      preparedBy: "—",
      preparedAt: "In attesa",
      expiresAt: "—",
      lotNumber: "LOT-2026-02-2844",
      notes: "Da preparare dopo le 10:00.",
    },
  },
  {
    id: "RX-2843",
    status: "completata",
    priority: "media",
    drug: "Metformina 850mg",
    form: "Compressa",
    container: "Contenitore E2",
    dispensed: 42.5,
    target: 42.5,
    errorRate: 0.0,
    executor: "L. Bianchi",
    executorInitials: "LB",
    station: "Post. 1",
    requestedAt: "07:45",
    startedAt: "08:00",
    finishedAt: "08:28",
    photos: [
      { type: "farmaco", label: "Metformina 850mg - Riconoscimento", url: "/placeholder.svg", barcode: "8033344455566" },
      { type: "contenitore", label: "Contenitore E2 - Blister", url: "/placeholder.svg" },
      { type: "preparazione", label: "Preparazione Finale", url: "/placeholder.svg" },
    ],
    supplementaryDoses: [],
    labelData: {
      patientName: "Giuseppe Esposito",
      patientId: "PAZ-20240315-005",
      drug: "Metformina 850mg",
      dosage: "850 mg",
      route: "Orale",
      volume: "—",
      preparedBy: "L. Bianchi",
      preparedAt: "23/02/2026 08:28",
      expiresAt: "23/03/2026",
      lotNumber: "LOT-2026-02-2843",
      notes: "Assumere durante i pasti principali.",
    },
  },
];
