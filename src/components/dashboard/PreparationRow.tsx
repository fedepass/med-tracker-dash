import { Check, X, ArrowRight, Clock, RotateCcw, LinkIcon, Unlink, PencilLine } from "lucide-react";
import { calcDispensedDisplay } from "@/lib/dispensedUnit";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader, AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import { type Status, type Priority, type ValidationStatus } from "@/data/preparations";
import { usePreparations } from "@/context/PreparationsContext";

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; className: string }> = {
  completata: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Completata", className: "text-status-complete" },
  esecuzione: { icon: <Loader className="h-4 w-4" />, label: "In esecuzione", className: "text-status-progress" },
  errore: { icon: <AlertTriangle className="h-4 w-4" />, label: "Errore", className: "text-status-error" },
  attesa:   { icon: <Clock className="h-4 w-4" />, label: "Da eseguire", className: "text-status-waiting" },
  corretta: { icon: <PencilLine className="h-4 w-4" />, label: "Corretta", className: "text-status-corretta" },
  warning_dosaggio: { icon: <AlertTriangle className="h-4 w-4" />, label: "Warning dosaggio", className: "text-status-warning-dosaggio" },
  fallita: { icon: <AlertTriangle className="h-4 w-4" />, label: "Fallita", className: "text-status-error" },
};

const validationConfig: Record<NonNullable<ValidationStatus>, { icon: React.ReactNode; label: string; className: string }> = {
  validata: { icon: <ShieldCheck className="h-4 w-4" />, label: "Validata", className: "text-status-complete" },
  rifiutata: { icon: <ShieldX className="h-4 w-4" />, label: "Rifiutata", className: "text-status-error" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-status-error-bg text-status-error" },
  media: { label: "Media", className: "bg-status-progress-bg text-status-progress" },
  bassa: { label: "Bassa", className: "bg-status-complete-bg text-status-complete" },
};

interface Preparation {
  id: string;
  status: Status;
  priority: Priority;
  validationStatus: ValidationStatus | null;
  drug: string;
  drugCatalogId?: number | null;
  drugCatalogName?: string | null;
  drugCatalogNeedsReview?: boolean;
  drugCatalogConcentration?: string | null;
  drugCatalogVialVolume?: number | null;
  drugCategory?: string | null;
  labelData: {
    dosage?: string | null;
    solvent?: string | null;
    volume?: string | null;
  };
  containerCatalogId?: number | null;
  containerCatalogName?: string | null;
  currentProcessStepId?: number | null;
  processStepOrder?: number | null;
  processStepName?: string | null;
  processStepsTotal?: number | null;
  volumeValue?: number | null;
  dispensed: number;
  dosageValue?: number | null;
  dosageUnit?: string | null;
  specificGravity?: number | null;
  errorRate: number;
  station?: string | null;
  cappaId?: number | null;
  requestedAt: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  date: string;
}

interface PreparationRowProps {
  p: Preparation;
  mode: "active" | "archived";
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  validatePreparation: (id: string) => void;
  undoPreparation: (id: string) => void;
  getRejectionReason: (id: string) => string | undefined;
  onReject: (id: string, defaultReason?: import("@/context/PreparationsContext").RejectionReason) => void;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function PreparationRow({
  p,
  mode,
  selected,
  toggleSelect,
  validatePreparation,
  undoPreparation,
  getRejectionReason,
  onReject,
}: PreparationRowProps) {
  const navigate = useNavigate();
  const { cappe, reassignCappa } = usePreparations();

  const sc = statusConfig[p.status];
  const pc = priorityConfig[p.priority];
  const rejectionReason = mode === "archived" ? getRejectionReason(p.id) : undefined;

  return (
    <tr
      onClick={() => mode === "active" && toggleSelect(p.id)}
      className={`border-b border-border transition-colors last:border-0 hover:bg-secondary/50 ${mode === "active" ? "cursor-pointer" : ""} ${selected.has(p.id) ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
    >
      {mode === "active" && (
        <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
        </td>
      )}
      <td className="px-3 py-1.5">
        <p className="font-semibold text-foreground">{p.id}</p>
        <div className={`flex items-center gap-1 text-xs ${sc.className}`}>
          {sc.icon}
          {sc.label}
        </div>
      </td>
      <td className="px-3 py-1.5">
        {p.validationStatus ? (
          <div className={`flex items-center gap-1 text-xs ${validationConfig[p.validationStatus].className}`}>
            {validationConfig[p.validationStatus].icon}
            {validationConfig[p.validationStatus].label}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <Badge variant="outline" className={`border-0 text-[10px] font-medium ${pc.className}`}>
          {pc.label}
        </Badge>
      </td>
      <td className={`px-3 py-1.5 ${p.drugCatalogId == null || p.drugCatalogNeedsReview ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
        <p className={`font-medium ${p.drugCatalogNeedsReview ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
          {p.drug}
          {p.labelData.dosage && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{p.labelData.dosage}</span>
          )}
        </p>
        {p.drugCatalogId != null ? (
          <span className={`inline-flex items-center gap-0.5 text-[10px] mt-0.5 ${p.drugCatalogNeedsReview ? "text-amber-600 dark:text-amber-400 font-medium" : "text-emerald-600 dark:text-emerald-400"}`}>
            <LinkIcon className="h-2.5 w-2.5" />{p.drugCatalogName ?? "catalogo"}{p.drugCatalogNeedsReview && " ⚠ da verif."}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            <Unlink className="h-2.5 w-2.5" />no catalogo
          </span>
        )}
      </td>
      <td className={`px-3 py-1.5 ${p.containerCatalogId == null ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
        {p.labelData.solvent ? (
          <p className="text-sm font-medium text-foreground">{p.labelData.solvent}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
        {p.labelData.volume ? (
          <p className="text-xs text-muted-foreground mt-0.5">{p.labelData.volume}</p>
        ) : p.volumeValue != null ? (
          <p className="text-xs text-muted-foreground mt-0.5">{p.volumeValue} ml</p>
        ) : null}
        {p.containerCatalogId != null ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            <LinkIcon className="h-2.5 w-2.5" />{p.containerCatalogName ?? "catalogo"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            <Unlink className="h-2.5 w-2.5" />no catalogo
          </span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {(() => {
          const dispensedMl = p.dispensed ?? 0;
          const { value, unit } = calcDispensedDisplay(
            dispensedMl,
            p.dosageUnit,
            p.drugCatalogConcentration,
            p.drugCatalogVialVolume,
            p.specificGravity,
          );
          return (
            <div>
              <p className="text-sm font-medium text-foreground">
                {value} {unit}
              </p>
              {p.dosageValue != null && p.dosageUnit && (
                <p className="text-xs text-muted-foreground">
                  / {p.dosageValue} {p.dosageUnit}
                </p>
              )}
            </div>
          );
        })()}
      </td>
      <td className="px-3 py-1.5">
        {p.errorRate > 0 ? (
          <span className={`font-semibold ${
            p.errorRate <= 5 ? "text-green-600" :
            p.errorRate <= 10 ? "text-amber-500" :
            "text-status-error"
          }`}>
            {p.errorRate}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
        {mode === "active" && p.status === "attesa" && cappe.length > 0 ? (
          <Select
            value={p.cappaId != null ? String(p.cappaId) : "__none__"}
            onValueChange={(val) => {
              const id = val === "__none__" ? null : Number(val);
              const name = id != null ? (cappe.find((c) => c.id === id)?.name ?? null) : null;
              reassignCappa(p.id, id, name);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-36 border-dashed">
              <SelectValue placeholder="Non assegnata" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground italic">Non assegnata</span>
              </SelectItem>
              {cappe.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={p.station ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground italic"}>
            {p.station ?? "Non assegnata"}
          </span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>
            <Clock className="mr-1 inline h-3 w-3 text-status-waiting" />
            Richiesta: {p.requestedAt}
          </p>
          {p.startedAt && (
            <p>
              <ArrowRight className="mr-1 inline h-3 w-3 text-status-progress" />
              Inizio: {p.startedAt}
            </p>
          )}
          {p.finishedAt && (
            <p>
              <Check className="mr-1 inline h-3 w-3 text-status-complete" />
              Fine: {p.finishedAt}
            </p>
          )}
          {p.status === "esecuzione" && (
            <p className="text-status-progress font-medium">In corso...</p>
          )}
        </div>
      </td>
      {mode === "archived" && (
        <td className="px-3 py-1.5">
          {rejectionReason ? (
            <Badge variant="outline" className="border-0 bg-status-error-bg text-[10px] font-medium text-status-error">
              {rejectionReason}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}
      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
        {mode === "active" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {p.status !== "attesa" && p.status !== "esecuzione" && p.validationStatus === null ? (
              <>
                <button
                  onClick={() => validatePreparation(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-status-complete-bg px-3 py-1.5 text-xs font-semibold text-status-complete transition-colors hover:bg-status-complete/20"
                  title="Valida preparazione"
                >
                  <Check className="h-4 w-4" />
                  Valida
                </button>
                <button
                  onClick={() => {
                    const def = p.status === "errore" && p.volumeValue != null && p.dispensed > p.volumeValue
                      ? "Sovradosaggio"
                      : p.status === "errore" && p.volumeValue != null && p.dispensed < p.volumeValue && p.dispensed > 0
                      ? "Sottodosaggio"
                      : undefined;
                    onReject(p.id, def as import("@/context/PreparationsContext").RejectionReason | undefined);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-status-error-bg px-3 py-1.5 text-xs font-semibold text-status-error transition-colors hover:bg-status-error/20"
                  title="Rifiuta preparazione"
                >
                  <X className="h-4 w-4" />
                  Rifiuta
                </button>
              </>
            ) : null}
            <button
              onClick={() => navigate(`/preparation/${p.id}`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              title="Vedi dettagli"
            >
              <ArrowRight className="h-4 w-4" />
              Dettagli
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => undoPreparation(p.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-status-progress-bg px-3 py-1.5 text-xs font-semibold text-status-progress transition-colors hover:bg-status-progress/20"
              title="Annulla validazione o rifiuto e ripristina lo stato precedente"
            >
              <RotateCcw className="h-4 w-4" />
              Annulla
            </button>
            <button
              onClick={() => navigate(`/preparation/${p.id}`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              title="Vedi dettagli"
            >
              <ArrowRight className="h-4 w-4" />
              Dettagli
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
