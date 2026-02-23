import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type Status, type Priority } from "@/data/preparations";
import { usePreparations, type RejectionReason } from "@/context/PreparationsContext";
import Navbar from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import RejectDialog from "@/components/dashboard/RejectDialog";
import {
  ArrowLeft, CheckCircle2, Loader, AlertTriangle, Clock,
  Check, X, Printer, Camera, ScanBarcode, Beaker, FlaskConical,
  Package, Timer, Droplets, ArrowRight, ShieldCheck, ShieldX,
} from "lucide-react";

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string; bgClassName: string }> = {
  completata: { icon: <CheckCircle2 className="h-5 w-5" />, label: "Completata", className: "text-status-complete", bgClassName: "bg-status-complete-bg" },
  esecuzione: { icon: <Loader className="h-5 w-5" />, label: "In esecuzione", className: "text-status-progress", bgClassName: "bg-status-progress-bg" },
  errore: { icon: <AlertTriangle className="h-5 w-5" />, label: "Errore", className: "text-status-error", bgClassName: "bg-status-error-bg" },
  attesa: { icon: <Clock className="h-5 w-5" />, label: "Da eseguire", className: "text-status-waiting", bgClassName: "bg-status-waiting-bg" },
  validata: { icon: <ShieldCheck className="h-5 w-5" />, label: "Validata", className: "text-status-complete", bgClassName: "bg-status-complete-bg" },
  rifiutata: { icon: <ShieldX className="h-5 w-5" />, label: "Rifiutata", className: "text-status-error", bgClassName: "bg-status-error-bg" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Priorità Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Priorità Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Priorità Bassa", className: "bg-status-complete-bg text-status-complete" },
};

const photoTypeIcon: Record<string, React.ReactNode> = {
  farmaco: <Beaker className="h-4 w-4" />,
  diluente: <FlaskConical className="h-4 w-4" />,
  contenitore: <Package className="h-4 w-4" />,
  preparazione: <Camera className="h-4 w-4" />,
};

const PreparationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { preparations, validatePreparation, rejectPreparation, getRejectionReason } = usePreparations();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const prep = preparations.find((p) => p.id === id);

  if (!prep) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-[1400px] px-4 py-12 text-center sm:px-6">
          <p className="text-lg text-muted-foreground">Preparazione non trovata.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const sc = statusConfig[prep.status];
  const pc = priorityConfig[prep.priority];
  const progressPercent = Math.min((prep.dispensed / prep.target) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Back + Header */}
        <div className="mb-4">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Torna alla Dashboard
          </button>
        </div>

        {/* Sticky header with info + actions */}
        <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${sc.bgClassName} ${sc.className}`}>
                {sc.icon}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{prep.id}</h1>
                  <Badge variant="outline" className={`border-0 text-xs font-medium ${pc.className}`}>{pc.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{prep.drug} · {prep.form} · {prep.container}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Ristampa Etichetta
              </Button>
              {prep.status !== "validata" && prep.status !== "rifiutata" ? (
                <>
                  <Button
                    className="gap-2 bg-status-complete text-primary-foreground hover:bg-status-complete/90"
                    onClick={() => { validatePreparation(prep.id); navigate("/"); }}
                  >
                    <Check className="h-4 w-4" /> Valida
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => setRejectDialogOpen(true)}>
                    <X className="h-4 w-4" /> Rifiuta
                  </Button>
                </>
              ) : (
                <Badge className={`text-sm ${prep.status === "validata" ? "bg-status-complete-bg text-status-complete" : "bg-status-error-bg text-status-error"}`}>
                  {prep.status === "validata" ? "Validata" : `Rifiutata: ${getRejectionReason(prep.id) ?? ""}`}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: Photos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Component photos */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Camera className="h-5 w-5 text-primary" /> Foto Acquisite
              </h2>
              {prep.photos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground italic">Nessuna foto disponibile per questa preparazione.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">{photo.label}</p>
                        {photo.barcode && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
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

            {/* Supplementary doses */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Droplets className="h-5 w-5 text-primary" /> Dosaggi Supplementari
              </h2>
              {prep.supplementaryDoses.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground italic">Nessun dosaggio supplementare registrato.</p>
              ) : (
                <div className="space-y-3">
                  {prep.supplementaryDoses.map((dose, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-progress-bg text-status-progress">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">+{dose.amount} {dose.unit}</span>
                          <span className="text-xs text-muted-foreground">ore {dose.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{dose.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column: Info */}
          <div className="space-y-6">
            {/* Timing */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Timer className="h-5 w-5 text-primary" /> Tempi di Esecuzione
              </h2>
              <div className="space-y-3">
                <TimeRow icon={<Clock className="h-4 w-4 text-status-waiting" />} label="Richiesta" value={prep.requestedAt} />
                <TimeRow icon={<ArrowRight className="h-4 w-4 text-status-progress" />} label="Inizio" value={prep.startedAt ?? "—"} />
                <TimeRow icon={<Check className="h-4 w-4 text-status-complete" />} label="Fine" value={prep.finishedAt ?? (prep.status === "esecuzione" ? "In corso..." : "—")} highlight={prep.status === "esecuzione"} />
                {prep.startedAt && prep.finishedAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Durata totale</span>
                      <span className="text-sm font-semibold text-foreground">{calcDuration(prep.startedAt, prep.finishedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Quantities */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Beaker className="h-5 w-5 text-primary" /> Quantitativi
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium text-foreground">{prep.target}ml</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Erogato</span>
                  <span className="font-medium text-foreground">{prep.dispensed}ml</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${prep.errorRate > 2 ? "bg-status-error" : "bg-status-complete"}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Errore</span>
                  <span className={`font-semibold ${prep.errorRate > 2 ? "text-status-error" : prep.errorRate > 0 ? "text-status-progress" : "text-muted-foreground"}`}>
                    {prep.errorRate > 0 ? `${prep.errorRate}%` : "—"}
                  </span>
                </div>
                {prep.supplementaryDoses.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dosi supplementari</span>
                      <span className="font-medium text-foreground">{prep.supplementaryDoses.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tot. supplementare</span>
                      <span className="font-medium text-foreground">
                        +{prep.supplementaryDoses.reduce((s, d) => s + d.amount, 0).toFixed(1)}ml
                      </span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Executor */}
            {prep.executor && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Esecutore</h2>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-sm font-medium text-foreground">{prep.executorInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{prep.executor}</p>
                    <p className="text-xs text-muted-foreground">{prep.station}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Label Data */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Printer className="h-5 w-5 text-primary" /> Dati Etichetta
                </h2>
              </div>
              <div className="space-y-2.5 text-sm">
                <LabelRow label="Paziente" value={prep.labelData.patientName} />
                <LabelRow label="ID Paziente" value={prep.labelData.patientId} mono />
                <LabelRow label="Farmaco" value={prep.labelData.drug} />
                <LabelRow label="Dosaggio" value={prep.labelData.dosage} />
                <LabelRow label="Via" value={prep.labelData.route} />
                <LabelRow label="Volume" value={prep.labelData.volume} />
                <Separator />
                <LabelRow label="Preparato da" value={prep.labelData.preparedBy} />
                <LabelRow label="Data prep." value={prep.labelData.preparedAt} />
                <LabelRow label="Scadenza" value={prep.labelData.expiresAt} />
                <LabelRow label="Lotto" value={prep.labelData.lotNumber} mono />
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground">Note</span>
                  <p className="mt-0.5 text-sm text-foreground">{prep.labelData.notes}</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <RejectDialog
          open={rejectDialogOpen}
          preparationIds={prep ? [prep.id] : []}
          onConfirm={(reason) => {
            rejectPreparation(prep!.id, reason);
            setRejectDialogOpen(false);
            navigate("/");
          }}
          onCancel={() => setRejectDialogOpen(false)}
        />
      </main>
    </div>
  );
};

const TimeRow = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <span className={`text-sm font-medium ${highlight ? "text-status-progress" : "text-foreground"}`}>{value}</span>
  </div>
);

const LabelRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className={`text-right text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
  </div>
);

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "—";
  return `${diff} min`;
}

export default PreparationDetail;
