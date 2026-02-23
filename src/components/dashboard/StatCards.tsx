import { Clock, Loader, CheckCircle2, AlertTriangle, List } from "lucide-react";
import type { Status } from "@/data/preparations";

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
    className={`flex flex-1 items-center gap-4 rounded-xl border-2 bg-card p-5 shadow-sm transition-all hover:shadow-md text-left ${
      active ? `border-current ${colorClass}` : "border-border"
    }`}
  >
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
      <span className={colorClass}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </button>
);

interface StatCardsProps {
  activeStatus: Status | null;
  onStatusClick: (status: Status) => void;
}

const StatCards = ({ activeStatus, onStatusClick }: StatCardsProps) => {
  const stats: { status: Status | null; icon: React.ReactNode; value: number; label: string; colorClass: string; bgClass: string }[] = [
    { status: null, icon: <List className="h-6 w-6" />, value: 191, label: "Totale", colorClass: "text-primary", bgClass: "bg-primary/10" },
    { status: "attesa", icon: <Clock className="h-6 w-6" />, value: 24, label: "In Attesa", colorClass: "text-status-waiting", bgClass: "bg-status-waiting-bg" },
    { status: "esecuzione", icon: <Loader className="h-6 w-6" />, value: 8, label: "In Esecuzione", colorClass: "text-status-progress", bgClass: "bg-status-progress-bg" },
    { status: "completata", icon: <CheckCircle2 className="h-6 w-6" />, value: 156, label: "Completate", colorClass: "text-status-complete", bgClass: "bg-status-complete-bg" },
    { status: "errore", icon: <AlertTriangle className="h-6 w-6" />, value: 3, label: "Con Errori", colorClass: "text-status-error", bgClass: "bg-status-error-bg" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          colorClass={stat.colorClass}
          bgClass={stat.bgClass}
          active={activeStatus === stat.status}
          onClick={() => onStatusClick(stat.status as Status)}
        />
      ))}
    </div>
  );
};

export default StatCards;
