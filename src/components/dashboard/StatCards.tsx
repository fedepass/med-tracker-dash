import { Clock, Loader, CheckCircle2, AlertTriangle } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
  bgClass: string;
}

const StatCard = ({ icon, value, label, colorClass, bgClass }: StatCardProps) => (
  <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgClass}`}>
      <span className={colorClass}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

const StatCards = () => {
  const stats = [
    { icon: <Clock className="h-6 w-6" />, value: 24, label: "In Attesa", colorClass: "text-status-waiting", bgClass: "bg-status-waiting-bg" },
    { icon: <Loader className="h-6 w-6" />, value: 8, label: "In Esecuzione", colorClass: "text-status-progress", bgClass: "bg-status-progress-bg" },
    { icon: <CheckCircle2 className="h-6 w-6" />, value: 156, label: "Completate", colorClass: "text-status-complete", bgClass: "bg-status-complete-bg" },
    { icon: <AlertTriangle className="h-6 w-6" />, value: 3, label: "Con Errori", colorClass: "text-status-error", bgClass: "bg-status-error-bg" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
};

export default StatCards;
