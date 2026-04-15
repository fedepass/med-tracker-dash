import { Clock, Loader, CheckCircle2, AlertTriangle, List, PencilLine, Syringe } from "lucide-react";
import type { Status } from "@/data/preparations";
import { usePreparations } from "@/context/PreparationsContext";
import { useMemo } from "react";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
  bgClass: string;
  active: boolean;
  onClick: () => void;
}

const StatCard = ({ icon, value, label, colorClass, bgClass, active, onClick }: StatCardProps) => (
  <button
    onClick={onClick}
    className={`flex flex-1 items-center gap-3 rounded-lg border-2 bg-card px-4 py-2.5 shadow-sm transition-all hover:shadow-md text-left ${
      active ? `border-current ${colorClass}` : "border-border"
    }`}
  >
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
      <span className={colorClass}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </button>
);

interface StatCardsProps {
  activeStatus: Status | null;
  onStatusClick: (status: Status | null) => void;
  dateFrom: string;
  dateTo: string;
}

const StatCards = ({ activeStatus, onStatusClick, dateFrom, dateTo }: StatCardsProps) => {
  const { preparations } = usePreparations();

  const counts = useMemo(() => {
    const forDate = preparations
      .filter((p) => p.date >= dateFrom && p.date <= dateTo)
      .filter((p) => p.validationStatus === null);
    return {
      totale: forDate.length,
      attesa: forDate.filter((p) => p.status === "attesa").length,
      esecuzione: forDate.filter((p) => p.status === "esecuzione").length,
      completata: forDate.filter((p) => p.status === "completata").length,
      errore: forDate.filter((p) => p.status === "errore" || p.status === "fallita").length,
      corretta: forDate.filter((p) => p.status === "corretta").length,
      warning_dosaggio: forDate.filter((p) => p.status === "warning_dosaggio").length,
    };
  }, [preparations, dateFrom, dateTo]);

  const stats: { status: Status | null; icon: React.ReactNode; value: number; label: string; colorClass: string; bgClass: string }[] = [
    { status: null, icon: <List className="h-4 w-4" />, value: counts.totale, label: "Totale", colorClass: "text-primary", bgClass: "bg-primary/10" },
    { status: "attesa", icon: <Clock className="h-4 w-4" />, value: counts.attesa, label: "In Attesa", colorClass: "text-status-waiting", bgClass: "bg-status-waiting-bg" },
    { status: "esecuzione", icon: <Loader className="h-4 w-4" />, value: counts.esecuzione, label: "In Esecuzione", colorClass: "text-status-progress", bgClass: "bg-status-progress-bg" },
    { status: "corretta", icon: <PencilLine className="h-4 w-4" />, value: counts.corretta, label: "Corrette", colorClass: "text-status-corretta", bgClass: "bg-status-corretta-bg" },
    { status: "warning_dosaggio", icon: <Syringe className="h-4 w-4" />, value: counts.warning_dosaggio, label: "Warning Dosaggio", colorClass: "text-status-warning-dosaggio", bgClass: "bg-status-warning-dosaggio-bg" },
    { status: "errore", icon: <AlertTriangle className="h-4 w-4" />, value: counts.errore, label: "Fallite", colorClass: "text-status-error", bgClass: "bg-status-error-bg" },
    { status: "completata", icon: <CheckCircle2 className="h-4 w-4" />, value: counts.completata, label: "Completate", colorClass: "text-status-complete", bgClass: "bg-status-complete-bg" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          colorClass={stat.colorClass}
          bgClass={stat.bgClass}
          active={
            stat.status === "errore"
              ? activeStatus === "errore" || activeStatus === "fallita"
              : activeStatus === stat.status
          }
          onClick={() => onStatusClick(stat.status)}
        />
      ))}
    </div>
  );
};

export default StatCards;
