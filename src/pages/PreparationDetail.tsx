import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { generateLabelPdf } from "@/lib/generateLabelPdf";
import { type Status, type Priority, type ValidationStatus, type Preparation, photoAssets } from "@/data/preparations";
import { usePreparations, type RejectionReason } from "@/context/PreparationsContext";
import { extFetch } from "@/lib/apiClient";
import { calcDispensedDisplay } from "@/lib/dispensedUnit";
import Navbar from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import RejectDialog from "@/components/dashboard/RejectDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft, Check, X, Printer, Camera, ScanBarcode,
  Beaker, FlaskConical, Timer, ArrowRight, Clock,
  RotateCcw, History,
} from "lucide-react";
import type { Drug, Container } from "@/components/config/types";
import { statusConfig, priorityConfig, photoTypeIcon, formatDT, formatTS, calcDuration } from "@/components/detail/detailConfig";
import TimeRow from "@/components/detail/TimeRow";
import LabelRow from "@/components/detail/LabelRow";

const DetailRow = ({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground shrink-0">{label}</span>
    {value ? (
      <span className={`font-medium text-foreground text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    ) : (
      <span className="text-muted-foreground text-xs italic">—</span>
    )}
  </div>
);

const PreparationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { preparations, refreshPreparations, validatePreparation, rejectPreparation, getRejectionReason, undoPreparation } = usePreparations();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailData, setDetailData] = useState<Preparation | null>(null);
  const [valHistory, setValHistory] = useState<Array<{
    id: number;
    action: string;
    reason: string | null;
    actor_name: string | null;
    created_at: string;
  }>>([]);
  const [drugCatalogId,              setDrugCatalogId]              = useState<number | null>(null);
  const [drugCatalogNeedsReview,     setDrugCatalogNeedsReview]     = useState<boolean>(false);
  const [drugCatalogConcentration,   setDrugCatalogConcentration]   = useState<string | null>(null);
  const [drugCatalogVialVolume,      setDrugCatalogVialVolume]      = useState<number | null>(null);
  const [containerCatalogId, setContainerCatalogId] = useState<number | null>(null);
  const [processStepOrder,   setProcessStepOrder]   = useState<number | null>(null);
  const [processStepName,    setProcessStepName]    = useState<string | null>(null);
  const [processStepsTotal,  setProcessStepsTotal]  = useState<number | null>(null);
  const [drugOptions,        setDrugOptions]        = useState<Drug[]>([]);
  const [containerOptions,   setContainerOptions]   = useState<Container[]>([]);
  const [linkSaving,         setLinkSaving]         = useState(false);
  const [drugSheet,          setDrugSheet]          = useState<Drug | null>(null);
  const [containerSheet,     setContainerSheet]     = useState<Container | null>(null);

  useEffect(() => {
    extFetch("/config/drugs").then((r) => r.ok ? r.json() : []).then((d: Drug[]) => setDrugOptions(d)).catch(() => {});
    extFetch("/config/containers").then((r) => r.ok ? r.json() : []).then((d: Container[]) => setContainerOptions(d)).catch(() => {});
  }, []);

  const handleSaveCatalogLinks = async () => {
    if (!id) return;
    setLinkSaving(true);
    try {
      const res = await extFetch(`/preparations/${id}/catalog-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drug_catalog_id: drugCatalogId, container_catalog_id: containerCatalogId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Associazioni catalogo salvate");
      refreshPreparations();
    } catch (err) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setLinkSaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    extFetch(`/preparations/${id}/validation-history`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setValHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    extFetch(`/preparations/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setDrugCatalogId(data.drug_catalog_id ?? null);
        setDrugCatalogNeedsReview(data.drug_catalog_needs_review ?? false);
        setDrugCatalogConcentration(data.drug_catalog_concentration ?? null);
        setDrugCatalogVialVolume(data.drug_catalog_vial_volume != null ? Number(data.drug_catalog_vial_volume) : null);
        setContainerCatalogId(data.container_catalog_id ?? null);
        setProcessStepOrder(data.process_step_order != null ? Number(data.process_step_order) : null);
        setProcessStepName(data.process_step_name ?? null);
        setProcessStepsTotal(data.process_steps_total != null ? Number(data.process_steps_total) : null);
        const label = data.label ?? data.labelData ?? {};
        setDetailData({
          id:               String(data.id),
          status:           data.status,
          validationStatus: data.validation_status ?? data.validationStatus ?? null,
          rejectionReason:  data.rejection_reason  ?? data.rejectionReason  ?? null,
          previousStatus:   data.previous_status   ?? data.previousStatus   ?? null,
          priority:         data.priority,
          drug:             data.drug,
          form:             data.form      ?? "",
          dispensed:        Number(data.dispensed),
          volumeValue:      data.volume_value != null ? Number(data.volume_value) : null,
          errorRate:        Number(data.error_rate ?? data.errorRate ?? 0),
          date:             String(data.date).slice(0, 10),
          requestedAt:      formatTS(data.created_at),
          startedAt:        formatTS(data.started_at),
          finishedAt:       formatTS(data.finished_at),
          hl7PrescriptionId: data.hl7_prescription_id ?? data.hl7PrescriptionId ?? null,
          executor:         data.executor_name ?? (typeof data.executor === "object" && data.executor !== null ? data.executor.name : data.executor) ?? null,
          executorInitials: data.executor_initials ?? (typeof data.executor === "object" && data.executor !== null ? data.executor.initials : data.executorInitials) ?? null,
          station:          data.cappa_name ?? (typeof data.station === "object" && data.station !== null ? data.station.name : data.station) ?? null,
          labelData: {
            patientId:   data.patient_id   ?? label.patient_id   ?? label.patientId   ?? "",
            patientName: data.patient_name ?? label.patient_name ?? label.patientName ?? "",
            patientWard: data.patient_ward ?? label.patient_ward ?? label.patientWard ?? "",
            drug:        label.drug        ?? data.drug ?? "",
            dosage:      data.dosage       ?? label.dosage       ?? "",
            route:       data.route        ?? label.route        ?? "",
            volume:      data.volume       ?? label.volume       ?? "",
            solvent:     label.solvent     ?? "",
            preparedBy:  label.prepared_by ?? label.preparedBy   ?? "",
            preparedAt:  label.prepared_at ?? label.preparedAt   ?? "",
            expiresAt:   label.expires_at  ?? label.expiresAt    ?? "",
            lotNumber:   data.lot_number   ?? label.lot_number   ?? label.lotNumber ?? "",
            notes:       data.notes        ?? label.notes        ?? "",
          },
          photos: (data.photos ?? []).map((ph: any) => {
            const photoType = ph.photo_type ?? ph.type ?? "";
            // Se la foto ha un id usa l'endpoint file; altrimenti fallback asset locale
            const EXT_BASE = (import.meta.env.VITE_EXT_API_URL as string) || "/ext-api";
            const EXT_KEY  = (import.meta.env.VITE_EXT_API_KEY  as string) || "";
            const photoUrl = ph.id
              ? `${EXT_BASE}/photos/${ph.id}/file${EXT_KEY ? `?key=${EXT_KEY}` : ""}`
              : (photoAssets[(ph.asset_key ?? ph.assetKey) as keyof typeof photoAssets] ?? ph.url ?? "");
            return {
              type:    photoType,
              label:   ph.label,
              url:     photoUrl,
              barcode: ph.barcode ?? null,
            };
          }),
        } as Preparation);
      })
      .catch(() => {});
  }, [id]);

  const contextPrep = preparations.find((p) => String(p.id) === id);
  const prep = detailData
    ? { ...detailData, validationStatus: contextPrep?.validationStatus ?? detailData.validationStatus }
    : contextPrep;

  if (!prep) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-[1400px] px-4 py-12 text-center sm:px-6">
          <p className="text-lg text-muted-foreground">Preparazione non trovata.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const sc = statusConfig[prep.status];
  const pc = priorityConfig[prep.priority];
  const progressPercent = prep.volumeValue ? Math.min((prep.dispensed / prep.volumeValue) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">

        {/* Back */}
        <div className="mb-3">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Torna alla Dashboard
          </button>
        </div>

        {/* Sticky header – compact */}
        <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sc.bgClassName} ${sc.className}`}>
                {sc.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{prep.id}</h1>
                  <Badge variant="outline" className={`border-0 text-xs font-medium ${pc.className}`}>{pc.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className={drugCatalogNeedsReview ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>{prep.drug}</span>
                  {prep.labelData.dosage && <> · <span className="font-medium text-foreground">{prep.labelData.dosage}</span></>}
                  {prep.labelData.volume && <> · {prep.labelData.volume}</>}
                  {prep.labelData.patientName && <> · <span className="font-medium text-foreground">{prep.labelData.patientName}</span></>}
                  {prep.labelData.patientWard && <> ({prep.labelData.patientWard})</>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => generateLabelPdf(prep)}
                disabled={prep.status === "attesa" || prep.status === "esecuzione"}
                title={prep.status === "attesa" || prep.status === "esecuzione" ? "Etichetta disponibile solo a preparazione terminata" : undefined}
              >
                <Printer className="h-3.5 w-3.5" /> Ristampa
              </Button>
              {prep.validationStatus === null ? (
                prep.status !== "attesa" && prep.status !== "esecuzione" ? (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs bg-status-complete text-primary-foreground hover:bg-status-complete/90"
                      onClick={() => { validatePreparation(prep.id); navigate(-1); }}
                    >
                      <Check className="h-3.5 w-3.5" /> Valida
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5 h-8 text-xs" onClick={() => setRejectDialogOpen(true)}>
                      <X className="h-3.5 w-3.5" /> Rifiuta
                    </Button>
                  </>
                ) : (
                  <Badge className="text-xs bg-status-waiting-bg text-status-waiting">
                    {prep.status === "attesa" ? "Da eseguire" : "In esecuzione"}
                  </Badge>
                )
              ) : (
                <>
                  <Badge className={`text-xs ${prep.validationStatus === "validata" ? "bg-status-complete-bg text-status-complete" : "bg-status-error-bg text-status-error"}`}>
                    {prep.validationStatus === "validata" ? "Validata" : `Rifiutata: ${getRejectionReason(prep.id) ?? ""}`}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => { undoPreparation(prep.id); navigate(-1); }}
                    title="Annulla validazione o rifiuto e ripristina lo stato precedente"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Annulla
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* ── Left column: Photos + Label Data ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Photos */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Camera className="h-4 w-4 text-primary" /> Foto Acquisite
              </h2>
              {prep.photos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground italic">Nessuna foto disponibile per questa preparazione.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {prep.photos.map((photo, i) => (
                    <div key={i} className="group overflow-hidden rounded-lg border border-border bg-secondary/30">
                      <div className="relative aspect-video bg-muted">
                        <img src={photo.url} alt={photo.label} className="h-full w-full object-cover" />
                        <div className="absolute left-2 top-2">
                          <Badge className="gap-1 bg-background/80 text-foreground backdrop-blur-sm text-[10px]">
                            {photoTypeIcon[photo.type]} {photo.type.charAt(0).toUpperCase() + photo.type.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-medium text-foreground">{photo.label}</p>
                        {photo.barcode && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ScanBarcode className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono">{photo.barcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Label Data – 2-column grid */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Printer className="h-4 w-4 text-primary" /> Dati Etichetta
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <LabelRow label="Paziente" value={prep.labelData.patientName} />
                <LabelRow label="ID Paziente" value={prep.labelData.patientId} mono />
                <LabelRow label="Reparto" value={prep.labelData.patientWard} />
                <LabelRow label="Via di somm." value={prep.labelData.route} />
                <LabelRow label="Farmaco" value={prep.labelData.drug} />
                <LabelRow label="Dosaggio" value={prep.labelData.dosage} />
                <LabelRow label="Volume" value={prep.labelData.volume} />
                <LabelRow label="Lotto" value={prep.labelData.lotNumber} mono />
                <LabelRow label="Preparato da" value={prep.labelData.preparedBy} />
                <LabelRow label="Data prep." value={prep.labelData.preparedAt} />
                <LabelRow label="Scadenza" value={prep.labelData.expiresAt} />
              </div>
              {prep.labelData.notes && (
                <div className="mt-2 border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">Note</span>
                  <p className="mt-0.5 text-sm text-foreground">{prep.labelData.notes}</p>
                </div>
              )}
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Combined: Timing + Quantities + Executor */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {/* Timing */}
              <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Timer className="h-4 w-4 text-primary" /> Tempi di Esecuzione
              </h2>
              <div className="space-y-2">
                <TimeRow icon={<Clock className="h-4 w-4 text-status-waiting" />} label="Richiesta" value={prep.requestedAt ?? "—"} />
                <TimeRow icon={<ArrowRight className="h-4 w-4 text-status-progress" />} label="Inizio" value={prep.startedAt ?? "—"} />
                <TimeRow icon={<Check className="h-4 w-4 text-status-complete" />} label="Fine" value={prep.finishedAt ?? (prep.status === "esecuzione" ? "In corso..." : "—")} highlight={prep.status === "esecuzione"} />
                {prep.startedAt && prep.finishedAt && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs text-muted-foreground">Durata</span>
                    <span className="text-xs font-semibold text-foreground">{calcDuration(prep.startedAt, prep.finishedAt)}</span>
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              {/* Quantities */}
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Beaker className="h-3.5 w-3.5 text-primary" /> Quantitativi
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Dosaggio</span>
                  <span className="font-medium text-foreground text-right">
                    {prep.labelData.dosage || "—"}
                    {drugCatalogId != null && drugOptions.find((d) => d.id === drugCatalogId) && (
                      <button
                        onClick={() => setDrugSheet(drugOptions.find((d) => d.id === drugCatalogId)!)}
                        className={`ml-1.5 hover:underline font-normal ${drugCatalogNeedsReview ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}
                        title={drugCatalogNeedsReview ? "Farmaco associato non ancora verificato" : undefined}
                      >
                        · {drugOptions.find((d) => d.id === drugCatalogId)!.name}{drugCatalogNeedsReview && " ⚠"}
                      </button>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Volume finale</span>
                  <span className="font-medium text-foreground text-right">
                    {prep.labelData.volume || (prep.volumeValue != null ? `${prep.volumeValue} ml` : "—")}
                    {containerCatalogId != null && containerOptions.find((c) => c.id === containerCatalogId) && (
                      <button
                        onClick={() => setContainerSheet(containerOptions.find((c) => c.id === containerCatalogId)!)}
                        className="ml-1.5 text-primary hover:underline font-normal"
                      >
                        · {containerOptions.find((c) => c.id === containerCatalogId)!.name}
                      </button>
                    )}
                  </span>
                </div>
                {(prep.status === "esecuzione" || prep.status === "completata" || prep.status === "errore" || prep.status === "fallita" || prep.status === "corretta" || prep.status === "warning_dosaggio") && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Erogato</span>
                      {prep.dispensed > 0 ? (() => {
                        const { value, unit } = calcDispensedDisplay(
                          prep.dispensed,
                          prep.dosageUnit,
                          drugCatalogConcentration ?? prep.drugCatalogConcentration,
                          drugCatalogVialVolume    ?? prep.drugCatalogVialVolume,
                          prep.specificGravity,
                        );
                        return (
                          <span className="font-medium text-foreground">
                            {value} {unit}
                            {prep.dosageValue != null && prep.dosageUnit && unit !== prep.dosageUnit && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({prep.dispensed.toFixed(3)} ml)
                              </span>
                            )}
                          </span>
                        );
                      })() : (
                        <span className="text-xs italic text-muted-foreground">N/D</span>
                      )}
                    </div>
                    {prep.dispensed > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${prep.errorRate > 10 ? "bg-status-error" : prep.errorRate > 5 ? "bg-status-progress" : "bg-status-complete"}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Errore</span>
                  <span className={`font-semibold ${prep.errorRate > 10 ? "text-status-error" : prep.errorRate > 5 ? "text-status-progress" : prep.errorRate > 0 ? "text-status-complete" : "text-muted-foreground"}`}>
                    {prep.errorRate > 0 ? `${prep.errorRate}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Executor */}
              {prep.executor && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">{prep.executorInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{prep.executor}</p>
                      <p className="text-xs text-muted-foreground">{prep.station}</p>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Catalog Links */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FlaskConical className="h-4 w-4 text-primary" /> Associazione Catalogo
              </h2>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Farmaco</span>
                  <Select value={drugCatalogId?.toString() ?? "none"} onValueChange={(v) => setDrugCatalogId(v === "none" ? null : Number(v))}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleziona farmaco..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"><span className="text-muted-foreground">— Nessuno —</span></SelectItem>
                      {drugOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Contenitore</span>
                  <Select value={containerCatalogId?.toString() ?? "none"} onValueChange={(v) => setContainerCatalogId(v === "none" ? null : Number(v))}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleziona contenitore..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"><span className="text-muted-foreground">— Nessuno —</span></SelectItem>
                      {containerOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}{c.volume_ml ? ` · ${c.volume_ml} ml` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="h-8 text-xs w-full" onClick={handleSaveCatalogLinks} disabled={linkSaving}>
                  {linkSaving ? "Salvataggio..." : "Salva associazioni"}
                </Button>
              </div>
            </section>

            {/* Validation History */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <History className="h-4 w-4 text-primary" /> Storico Validazione
              </h2>
              {valHistory.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground italic">Nessuna operazione registrata.</p>
              ) : (
                <ol className="relative border-l border-border ml-3 space-y-3">
                  {valHistory.map((entry, i) => {
                    const isLast = i === valHistory.length - 1;
                    const dotColor =
                      entry.action === "validata"  ? "bg-status-complete" :
                      entry.action === "rifiutata" ? "bg-status-error"    :
                      "bg-muted-foreground";
                    const label =
                      entry.action === "validata"  ? "Validata"  :
                      entry.action === "rifiutata" ? "Rifiutata" :
                      "Annullata";
                    const textColor =
                      entry.action === "validata"  ? "text-status-complete" :
                      entry.action === "rifiutata" ? "text-status-error"    :
                      "text-muted-foreground";
                    const dt = new Date(entry.created_at);
                    const dateStr = dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const timeStr = dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <li key={entry.id} className="ml-4">
                        <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-card ${dotColor} ${isLast ? "ring-2 ring-offset-1 ring-offset-card ring-border" : ""}`} />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{dateStr} {timeStr}</span>
                        </div>
                        {entry.reason && <p className="mt-0.5 text-xs text-muted-foreground">Motivo: {entry.reason}</p>}
                        {entry.actor_name && <p className="mt-0.5 text-xs text-muted-foreground">Operatore: {entry.actor_name}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

          </div>
        </div>

        {/* Drug detail sheet */}
        <Sheet open={!!drugSheet} onOpenChange={(o) => !o && setDrugSheet(null)}>
          <SheetContent className="w-80 sm:w-96 overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-base">{drugSheet?.name || "Farmaco"}</SheetTitle>
            </SheetHeader>
            {drugSheet && (
              <div className="space-y-2 text-sm">
                {drugSheet.needs_review && (
                  <Badge className="mb-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0">
                    Da verificare
                  </Badge>
                )}
                <DetailRow label="Principio attivo" value={drugSheet.active_ingredient} />
                <DetailRow label="Concentrazione"   value={drugSheet.concentration} mono />
                <DetailRow label="Codice ATC"        value={drugSheet.code} mono />
                <DetailRow label="Codice AIC"        value={drugSheet.aic_code} mono />
                <DetailRow label="Categoria"         value={drugSheet.category} />
                <DetailRow label="Volume fiala"      value={drugSheet.vial_volume != null ? `${drugSheet.vial_volume} ml` : null} />
                <DetailRow label="Peso specifico"    value={drugSheet.specific_gravity != null ? String(drugSheet.specific_gravity) : null} />
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Polvere liofilizzata</span>
                  <span className="font-medium">{drugSheet.is_powder ? "Sì" : "No"}</span>
                </div>
                {drugSheet.is_powder && (
                  <>
                    <DetailRow label="Diluente"          value={drugSheet.diluent} />
                    <DetailRow label="Vol. ricostituzione" value={drugSheet.reconstitution_volume != null ? `${drugSheet.reconstitution_volume} ${drugSheet.reconstitution_volume_unit ?? "ml"}` : null} />
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Container detail sheet */}
        <Sheet open={!!containerSheet} onOpenChange={(o) => !o && setContainerSheet(null)}>
          <SheetContent className="w-80 sm:w-96 overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-base">{containerSheet?.name || "Contenitore"}</SheetTitle>
            </SheetHeader>
            {containerSheet && (
              <div className="space-y-2 text-sm">
                {containerSheet.needs_review && (
                  <Badge className="mb-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0">
                    Da verificare
                  </Badge>
                )}
                <DetailRow label="Volume"         value={containerSheet.volume_ml != null ? `${containerSheet.volume_ml} ml` : null} />
                <DetailRow label="Solvente"       value={containerSheet.solvent} />
                <DetailRow label="Tipo"           value={containerSheet.container_type} />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attivo</span>
                  <span className="font-medium">{containerSheet.enabled ? "Sì" : "No"}</span>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <RejectDialog
          open={rejectDialogOpen}
          preparationIds={prep ? [prep.id] : []}
          onConfirm={(reason) => {
            rejectPreparation(prep!.id, reason);
            setRejectDialogOpen(false);
            navigate(-1);
          }}
          onCancel={() => setRejectDialogOpen(false)}
        />
      </main>
    </div>
  );
};

export default PreparationDetail;
