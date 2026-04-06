import React from "react";

interface TimeRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  highlight?: boolean;
}

const TimeRow = ({ icon, label, value, highlight }: TimeRowProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <span className={`text-sm font-medium ${highlight ? "text-status-progress" : "text-foreground"}`}>
      {value ?? "—"}
    </span>
  </div>
);

export default TimeRow;
