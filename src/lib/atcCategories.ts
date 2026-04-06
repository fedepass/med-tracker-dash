/**
 * Decodifica un codice ATC verso una categoria farmacologica in italiano.
 * Usa il livello 2 (3 caratteri) come prima scelta, poi il livello 1 (lettera) come fallback.
 */

const ATC_L2: Record<string, string> = {
  // A – Apparato gastrointestinale e metabolismo
  A01: "Stomatologici",
  A02: "Farmaci per disturbi dell'acidità",
  A03: "Antispastici e anticolinergici",
  A04: "Antiemetici e antinausea",
  A05: "Farmaci per terapia biliare ed epatica",
  A06: "Lassativi",
  A07: "Antidiarroici e antiinfiammatori intestinali",
  A08: "Farmaci per l'obesità",
  A09: "Digestivi",
  A10: "Farmaci per il diabete",
  A11: "Vitamine",
  A12: "Integratori minerali",
  A13: "Tonici",
  A14: "Anabolizzanti",
  A15: "Stimolanti dell'appetito",
  A16: "Farmaci per disturbi metabolici",
  // B – Sangue ed organi emopoietici
  B01: "Antitrombotici",
  B02: "Antiemorragici",
  B03: "Farmaci antianemici",
  B05: "Sostituti del plasma e soluzioni perfusionali",
  B06: "Ematologici",
  // C – Sistema cardiovascolare
  C01: "Terapia cardiaca",
  C02: "Antiipertensivi",
  C03: "Diuretici",
  C04: "Vasodilatatori periferici",
  C05: "Vasoprotettori",
  C07: "Betabloccanti",
  C08: "Calcioantagonisti",
  C09: "Farmaci renina-angiotensina",
  C10: "Ipolipemizzanti",
  // D – Dermatologici
  D01: "Antifungini dermatologici",
  D02: "Emollienti e protettivi",
  D03: "Preparazioni per ferite e ulcere",
  D04: "Antipruriginosi",
  D05: "Antipsoriatici",
  D06: "Antibiotici e chemioterapici dermatologici",
  D07: "Corticosteroidi dermatologici",
  D08: "Antisettici e disinfettanti",
  D10: "Farmaci per acne",
  D11: "Altri dermatologici",
  // G – Sistema genito-urinario
  G01: "Ginecologici antiinfettivi",
  G02: "Ginecologici",
  G03: "Ormoni sessuali",
  G04: "Farmaci urologici",
  // H – Ormoni sistemici
  H01: "Ormoni ipofisari e ipotalamici",
  H02: "Corticosteroidi sistemici",
  H03: "Farmaci tiroidei",
  H04: "Ormoni pancreatici",
  H05: "Ormoni calciotropi",
  // J – Antimicrobici
  J01: "Antibatterici per uso sistemico",
  J02: "Antimicotici per uso sistemico",
  J04: "Antimicobatterici",
  J05: "Antivirali per uso sistemico",
  J06: "Immunosieri e immunoglobuline",
  J07: "Vaccini",
  // L – Antineoplastici
  L01: "Antineoplastici",
  L02: "Terapia endocrina antitumorale",
  L03: "Immunostimolanti",
  L04: "Immunosoppressori",
  // M – Sistema muscolo-scheletrico
  M01: "Antiinfiammatori e antireumatici",
  M02: "Topici per dolori muscolari",
  M03: "Miorilassanti",
  M04: "Farmaci per gotta",
  M05: "Farmaci per malattie ossee",
  M09: "Altri farmaci muscolo-scheletrici",
  // N – Sistema nervoso
  N01: "Anestetici",
  N02: "Analgesici",
  N03: "Antiepilettici",
  N04: "Farmaci per Parkinson",
  N05: "Psicofarmaci",
  N06: "Psicoanalettici",
  N07: "Altri farmaci del sistema nervoso",
  // P – Antiparassitari
  P01: "Antiprotozoari",
  P02: "Antielmintici",
  P03: "Ectoparassiticidi",
  // R – Sistema respiratorio
  R01: "Preparazioni nasali",
  R02: "Preparazioni per la gola",
  R03: "Farmaci per ostruzione vie aeree",
  R05: "Preparazioni per tosse e raffreddore",
  R06: "Antistaminici sistemici",
  R07: "Altri farmaci respiratori",
  // S – Organi di senso
  S01: "Oftalmologici",
  S02: "Otologici",
  S03: "Preparazioni oftalmo-otologiche",
  // V – Vari
  V01: "Allergeni",
  V03: "Farmaci terapeutici vari",
  V04: "Agenti diagnostici",
  V06: "Nutrienti",
  V08: "Mezzi di contrasto",
  V09: "Diagnostici radiofarmaceutici",
  V10: "Radioterapeutici",
};

const ATC_L1: Record<string, string> = {
  A: "Apparato gastrointestinale e metabolismo",
  B: "Sangue ed organi emopoietici",
  C: "Sistema cardiovascolare",
  D: "Dermatologici",
  G: "Sistema genito-urinario e ormoni sessuali",
  H: "Preparazioni ormonali sistemiche",
  J: "Antimicrobici per uso sistemico",
  L: "Farmaci antineoplastici e immunomodulatori",
  M: "Sistema muscolo-scheletrico",
  N: "Sistema nervoso",
  P: "Antiparassitari",
  R: "Sistema respiratorio",
  S: "Organi di senso",
  V: "Vari",
};

/**
 * Restituisce la categoria farmacologica italiana dal codice ATC.
 * Prova prima livello 2 (3 caratteri), poi livello 1 (lettera).
 */
export function atcToCategory(atcCode: string): string | null {
  if (!atcCode) return null;
  const upper = atcCode.toUpperCase();
  return ATC_L2[upper.slice(0, 3)] ?? ATC_L1[upper.charAt(0)] ?? null;
}
