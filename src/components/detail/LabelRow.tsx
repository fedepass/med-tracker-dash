import React from "react";

interface LabelRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

const LabelRow = ({ label, value, mono }: LabelRowProps) => (
  <div className="flex justify-between gap-4">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className={`text-right text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>
      {value}
    </span>
  </div>
);

export default LabelRow;
