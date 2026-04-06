/**
 * Calcola la quantità erogata nell'unità di misura del dosaggio.
 *
 * Strategia:
 *  1. Se dosageUnit è ml/l → mostra direttamente in ml.
 *  2. Cerca concentrazione nell'anagrafica (concentration + vial_volume) e converte:
 *       dispensed_ml × concentration_per_ml  → dosageUnit
 *  3. Fallback: specific_gravity per unità massa (mg/g/mcg).
 *  4. Ultima risorsa: mostra in ml con nota.
 */

/** Normalizza l'unità per il confronto (UI/U/IU → "ui", MG/mg → "mg", …) */
function normUnit(u: string): string {
  const s = u.trim().toLowerCase().replace(/\s/g, "");
  if (["ui", "u.i.", "iu", "u"].includes(s)) return "ui";
  if (s === "μg" || s === "mcg") return "mcg";
  return s;
}

/**
 * Parsa una stringa di concentrazione e restituisce il valore per ml
 * nell'unità trovata.
 *
 * Formati supportati:
 *   "200 UI/ml"         → { valuePerMl: 200,  unit: "UI" }
 *   "5 MG / ML"         → { valuePerMl: 5,    unit: "MG" }
 *   "300 MG/50 ML"      → { valuePerMl: 6,    unit: "MG" }
 *   "1 G/10 ML"         → { valuePerMl: 0.1,  unit: "G"  }
 *   "500 MG"  (totale)  → richiede vialVolumeMl per dividere
 *   "5.000 UI" (totale) → "5.000" = 5000 in notazione italiana
 */
function parseConcentration(
  concentration: string | null,
  vialVolumeMl: number | null,
): { valuePerMl: number; unit: string } | null {
  if (!concentration) return null;
  const c = concentration.trim();

  /** Parsa numero italiano ("5.000" = 5000, "0.04" = 0.04, "1.500,5" = 1500.5) */
  const parseNum = (s: string): number => {
    // Se periodo seguito esattamente da 3 cifre e basta → separatore migliaia
    const cleaned = s.replace(/\.(\d{3})(?!\d)/g, "$1").replace(",", ".");
    return parseFloat(cleaned);
  };

  // Pattern 1 – "X UNIT / Y? ML" (concentrazione per volume)
  //   "200 UI/ml", "5 MG/ML", "300 MG/50 ML", "1 G/10 ML", "5 MG / ML"
  const perVol = c.match(
    /^([\d.,]+)\s*([A-Za-zμ]+(?:\s*\/\s*[A-Za-z]+)?)\s*\/\s*([\d.,]+)?\s*m[lL]$/i,
  );
  if (perVol) {
    const amount = parseNum(perVol[1]);
    const unit   = perVol[2].trim();
    const vol    = perVol[3] ? parseNum(perVol[3]) : 1;
    if (vol > 0 && !isNaN(amount)) return { valuePerMl: amount / vol, unit };
  }

  // Pattern 2 – "X UNIT" (quantità totale nel flacone) → richiede vial_volume
  const total = c.match(/^([\d.,]+)\s*([A-Za-zμ.]+)$/i);
  if (total && vialVolumeMl && vialVolumeMl > 0) {
    const amount = parseNum(total[1]);
    const unit   = total[2].trim();
    if (!isNaN(amount)) return { valuePerMl: amount / vialVolumeMl, unit };
  }

  return null;
}

export interface DispensedDisplay {
  value: string;
  unit: string;
  converted: boolean; // true se diverso da ml
}

/**
 * Calcola come mostrare la quantità erogata.
 *
 * @param dispensedMl     Quantità erogata in ml (dal bilancino)
 * @param dosageUnit      Unità di misura del dosaggio prescritto (UI, mg, …)
 * @param concentration   Stringa concentrazione dall'anagrafica (es. "200 UI/ml")
 * @param vialVolumeMl    Volume flacone in ml dall'anagrafica
 * @param specificGravity Densità (g/ml) dall'anagrafica (fallback)
 */
export function calcDispensedDisplay(
  dispensedMl: number,
  dosageUnit: string | null | undefined,
  concentration: string | null | undefined,
  vialVolumeMl: number | null | undefined,
  specificGravity: number | null | undefined,
): DispensedDisplay {
  const du = (dosageUnit ?? "").trim();
  const duNorm = normUnit(du);

  // Unità già ml/l → nessuna conversione necessaria
  if (!du || duNorm === "ml" || duNorm === "l") {
    return { value: dispensedMl.toFixed(3), unit: "ml", converted: false };
  }

  // --- Tentativo 1: usa concentrazione dall'anagrafica ---
  const conc = parseConcentration(concentration ?? null, vialVolumeMl ?? null);
  if (conc) {
    const concUnitNorm = normUnit(conc.unit);
    if (concUnitNorm === duNorm && conc.valuePerMl > 0) {
      const converted = dispensedMl * conc.valuePerMl;
      return { value: converted.toFixed(3), unit: du, converted: true };
    }
  }

  // --- Tentativo 2: specific_gravity per unità massa ---
  if (specificGravity != null && specificGravity > 0) {
    const grams = dispensedMl * specificGravity;
    if (duNorm === "mg")  return { value: (grams * 1_000).toFixed(3),     unit: du, converted: true };
    if (duNorm === "mcg") return { value: (grams * 1_000_000).toFixed(3), unit: du, converted: true };
    if (duNorm === "g")   return { value: grams.toFixed(3),               unit: du, converted: true };
  }

  // Fallback: mostra in ml
  return { value: dispensedMl.toFixed(3), unit: "ml", converted: false };
}
