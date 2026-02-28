import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import type { Preparation } from "@/data/preparations";

// ── Costanti layout ──────────────────────────────────────────────────────────
const PAGE_W = 80;   // mm
const PAGE_H = 80;   // mm
const M = 3.5;       // margine mm
const CW = PAGE_W - M * 2; // larghezza contenuto

// Altezza riga approssimativa da fontSize (pt) in mm
const lh = (pt: number) => pt * 0.352778 * 1.35;

export function generateLabelPdf(prep: Preparation): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
  });

  // ── Helper: testo ──────────────────────────────────────────────────────────
  const t = (
    str: string,
    x: number,
    y: number,
    opts?: {
      size?: number;
      bold?: boolean;
      color?: number | [number, number, number];
      align?: "left" | "right" | "center";
    }
  ) => {
    const { size = 7, bold = false, color = 0, align = "left" } = opts ?? {};
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    if (Array.isArray(color)) pdf.setTextColor(color[0], color[1], color[2]);
    else pdf.setTextColor(color);
    pdf.text(str, x, y, { align });
  };

  // ── Helper: linea separatrice ──────────────────────────────────────────────
  const sep = (y: number) => {
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(M, y, PAGE_W - M, y);
  };

  // ── Bordo esterno etichetta ────────────────────────────────────────────────
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(0.5, 0.5, PAGE_W - 1, PAGE_H - 1, 1, 1);

  let y = 0;

  // ── Header: sistema + ID preparazione ─────────────────────────────────────
  y = 5.5;
  t("PharmAR System", M, y, { size: 5.5, color: [130, 130, 130] });
  t(prep.id, PAGE_W - M, y, { size: 6.5, bold: true, align: "right" });
  y += lh(5.5) + 0.8;
  sep(y);
  y += 2.8;

  // ── Farmaco (prominente) ───────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(0);
  const drugLines = pdf.splitTextToSize(prep.labelData.drug.toUpperCase(), CW);
  pdf.text(drugLines, M, y);
  y += drugLines.length * lh(9) + 0.8;

  // Dose + Via di somministrazione
  t(`Dose: ${prep.labelData.dosage}    Via: ${prep.labelData.route}`, M, y, { size: 6.5 });
  y += lh(6.5) + 0.5;

  // Volume
  t(`Volume: ${prep.labelData.volume}`, M, y, { size: 6.5 });
  y += lh(6.5) + 1.2;
  sep(y);
  y += 2.8;

  // ── Paziente ──────────────────────────────────────────────────────────────
  t(`Paziente: ${prep.labelData.patientName}`, M, y, { size: 7.5, bold: true });
  y += lh(7.5) + 0.6;
  t(`ID: ${prep.labelData.patientId}`, M, y, { size: 6, color: [90, 90, 90] });
  y += lh(6) + 1.2;
  sep(y);
  y += 2.8;

  // ── Date e tracciabilità ───────────────────────────────────────────────────
  t(`Preparato:  ${prep.labelData.preparedAt}`, M, y, { size: 6.5 });
  y += lh(6.5) + 0.6;
  t(`Scadenza:   ${prep.labelData.expiresAt}`, M, y, { size: 6.5 });
  y += lh(6.5) + 0.6;
  t(`Prep. da: ${prep.labelData.preparedBy}`, M, y, { size: 6 });
  t(`Lotto: ${prep.labelData.lotNumber}`, PAGE_W - M, y, { size: 6, align: "right" });
  y += lh(6) + 0.6;

  // Note (solo prima riga se presenti)
  if (prep.labelData.notes) {
    const noteLine = pdf.splitTextToSize(`Note: ${prep.labelData.notes}`, CW)[0];
    t(noteLine, M, y, { size: 5.5, color: [100, 100, 100] });
    y += lh(5.5) + 0.6;
  }

  y += 0.5;
  sep(y);
  y += 2.5;

  // ── Barcode Code128 ────────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, prep.id, {
    format: "CODE128",
    width: 2.5,
    height: 55,
    displayValue: true,
    fontSize: 14,
    textMargin: 3,
    margin: 6,
    background: "#ffffff",
    lineColor: "#000000",
  });

  const barcodeImgData = canvas.toDataURL("image/png");
  const barcodeH = Math.max(PAGE_H - M - y, 12); // spazio rimanente, min 12mm
  pdf.addImage(barcodeImgData, "PNG", M, y, CW, barcodeH);

  // ── Apri PDF in nuova scheda ───────────────────────────────────────────────
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}
