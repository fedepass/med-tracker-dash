import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Zap, Clock, RefreshCw, Scale, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extFetch } from "@/lib/apiClient";
import type { AssignmentStrategy, AssignmentStepConfig, DrugPriorityRule } from "./types";

const STRATEGIES: { value: AssignmentStrategy; label: string; description: string; Icon: React.FC<{ className?: string }> }[] = [
  {
    value: "urgency",
    label: "Urgenza",
    description: "STAT → URGENT → ROUTINE. Le prescrizioni più urgenti vengono assegnate per prime.",
    Icon: ({ className }) => <Zap className={className} />,
  },
  {
    value: "fifo",
    label: "FIFO",
    description: "First In First Out. Le prescrizioni vengono elaborate nell'ordine di arrivo.",
    Icon: ({ className }) => <Clock className={className} />,
  },
  {
    value: "lifo",
    label: "LIFO",
    description: "Last In First Out. Le prescrizioni più recenti vengono elaborate per prime.",
    Icon: ({ className }) => <RefreshCw className={className} />,
  },
  {
    value: "round_robin",
    label: "Round-Robin",
    description: "Distribuzione ciclica equa tra tutte le cappe disponibili.",
    Icon: ({ className }) => <RefreshCw className={className} />,
  },
  {
    value: "load_balance",
    label: "Bilanciamento carico",
    description: "Assegna alla cappa con meno preparazioni in stato 'attesa' o 'esecuzione'.",
    Icon: ({ className }) => <Scale className={className} />,
  },
  {
    value: "drug_priority",
    label: "Priorità farmaci",
    description: "Anticipa farmaci specifici o categorie ATC con priorità configurabile.",
    Icon: ({ className }) => <Pill className={className} />,
  },
];

interface DrugPriorityRulesPanelProps {
  rules: DrugPriorityRule[];
  drugs: { id: number; name: string; active_ingredient: string | null }[];
  categories: { id: number; name: string }[];
  onAdd: (rule: Omit<DrugPriorityRule, "id">) => void;
  onUpdate: (id: number, patch: Partial<DrugPriorityRule>) => void;
  onDelete: (id: number) => void;
}

function DrugPriorityRulesPanel({ rules, drugs, categories, onAdd, onUpdate, onDelete }: DrugPriorityRulesPanelProps) {
  const [newType, setNewType] = useState<"drug" | "category">("drug");
  const [newValue, setNewValue] = useState("");
  const [newPriority, setNewPriority] = useState(1);

  // Usa active_ingredient deduplicato; fallback su name se non disponibile
  const drugPrincipi = Array.from(
    new Set(drugs.map((d) => d.active_ingredient || d.name).filter(Boolean))
  ).sort() as string[];

  const options = newType === "drug"
    ? drugPrincipi
    : categories.map((c) => c.name);

  // Reset selection when type changes
  function handleTypeChange(t: "drug" | "category") {
    setNewType(t);
    setNewValue("");
  }

  function handleAdd() {
    if (!newValue) return;
    onAdd({ rule_type: newType, value: newValue, priority: newPriority, enabled: true });
    setNewValue("");
    setNewPriority((prev) => prev + 1);
  }

  return (
    <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Regole di priorità</p>

      {rules.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Valore</th>
                <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-16">Priorità</th>
                <th className="px-2 py-1.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((rule) => (
                <tr key={rule.id} className={rule.enabled ? "" : "opacity-50"}>
                  <td className="px-2 py-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {rule.rule_type === "drug" ? "Farmaco" : "Categoria"}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 font-medium text-foreground">{rule.value}</td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number" min={1} value={rule.priority}
                      onChange={(e) => rule.id && onUpdate(rule.id, { priority: Number(e.target.value) })}
                      className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-xs focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="checkbox" checked={rule.enabled}
                        onChange={(e) => rule.id && onUpdate(rule.id, { enabled: e.target.checked })}
                        className="h-3 w-3 cursor-pointer"
                      />
                      <button
                        onClick={() => rule.id && onDelete(rule.id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={newType}
          onChange={(e) => handleTypeChange(e.target.value as "drug" | "category")}
          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none"
        >
          <option value="drug">Farmaco</option>
          <option value="category">Categoria</option>
        </select>
        <select
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none"
        >
          <option value="">— Seleziona {newType === "drug" ? "farmaco" : "categoria"} —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          type="number" min={1} value={newPriority}
          onChange={(e) => setNewPriority(Number(e.target.value))}
          className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-xs focus:outline-none"
          title="Livello di priorità (1 = massima)"
        />
        <button
          onClick={handleAdd}
          disabled={!newValue}
          className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-3 w-3" /> Aggiungi
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">Priorità 1 = prima. Il valore viene confrontato col nome farmaco o la categoria ATC della preparazione.</p>
    </div>
  );
}

export function AssignmentTab() {
  const [assignmentSteps, setAssignmentSteps] = useState<AssignmentStepConfig[]>([
    { strategy: "urgency", logic_op: "AND", enabled: true },
  ]);
  const [drugPriorityRules, setDrugPriorityRules] = useState<DrugPriorityRule[]>([]);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [drugOptions, setDrugOptions] = useState<{ id: number; name: string; active_ingredient: string | null }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string }[]>([]);

  const fetchStrategy = useCallback(async () => {
    try {
      const [stepsRes, rulesRes, drugsRes, catsRes] = await Promise.all([
        extFetch(`/config/assignment`),
        extFetch(`/config/drug-priority-rules`),
        extFetch(`/config/drugs`),
        extFetch(`/drugs/categories`),
      ]);
      if (stepsRes.ok) {
        const data: { steps: AssignmentStepConfig[] } = await stepsRes.json();
        if (data.steps?.length) setAssignmentSteps(data.steps);
      }
      if (rulesRes.ok) setDrugPriorityRules(await rulesRes.json());
      if (drugsRes.ok) {
        const drugs: { id: number; name: string; active_ingredient: string | null }[] = await drugsRes.json();
        setDrugOptions(drugs.map(({ id, name, active_ingredient }) => ({ id, name, active_ingredient: active_ingredient ?? null })));
      }
      if (catsRes.ok) setCategoryOptions(await catsRes.json());
    } catch {
      // silenzioso — default mantenuto
    }
  }, []);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  const handleSaveStrategy = async () => {
    if (assignmentSteps.length === 0) {
      toast.error("Aggiungi almeno un criterio");
      return;
    }
    setSavingStrategy(true);
    try {
      const res = await extFetch(`/config/assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: assignmentSteps }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.steps?.length) setAssignmentSteps(data.steps);
      toast.success("Strategia di assegnazione salvata");
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleAddDrugPriorityRule = async (rule: Omit<DrugPriorityRule, "id">) => {
    try {
      const res = await extFetch("/config/drug-priority-rules", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: DrugPriorityRule = await res.json();
      setDrugPriorityRules((prev) => [...prev.filter((r) => r.id !== created.id), created].sort((a, b) => a.priority - b.priority));
    } catch { toast.error("Errore nel salvataggio regola"); }
  };

  const handleUpdateDrugPriorityRule = async (id: number, patch: Partial<DrugPriorityRule>) => {
    try {
      const res = await extFetch(`/config/drug-priority-rules/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: DrugPriorityRule = await res.json();
      setDrugPriorityRules((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch { toast.error("Errore nell'aggiornamento regola"); }
  };

  const handleDeleteDrugPriorityRule = async (id: number) => {
    try {
      await extFetch(`/config/drug-priority-rules/${id}`, { method: "DELETE" });
      setDrugPriorityRules((prev) => prev.filter((r) => r.id !== id));
    } catch { toast.error("Errore nell'eliminazione regola"); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Definisci la sequenza di criteri di ordinamento. I criteri vengono applicati in ordine: se il primo non distingue due preparazioni, si applica il secondo, e così via.
      </p>

      {/* Step list */}
      <div className="space-y-2">
        {assignmentSteps.map((step, idx) => {
          const meta = STRATEGIES.find((s) => s.value === step.strategy)!;
          return (
            <div key={idx} className={cn(
              "rounded-lg border border-border transition-colors",
              step.enabled ? "bg-card" : "bg-muted/30 opacity-60"
            )}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Order badge */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>

                {/* Logic op toggle */}
                {idx > 0 ? (
                  <button
                    onClick={() => setAssignmentSteps((prev) => prev.map((s, i) =>
                      i === idx ? { ...s, logic_op: s.logic_op === "AND" ? "OR" : "AND" } : s
                    ))}
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                      step.logic_op === "AND"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    )}
                    title="Clicca per cambiare AND / OR"
                  >
                    {step.logic_op}
                  </button>
                ) : (
                  <span className="w-8 shrink-0" />
                )}

                {/* Strategy icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <meta.Icon className="h-3.5 w-3.5" />
                </div>

                {/* Strategy selector + description */}
                <div className="flex-1 min-w-0">
                  <select
                    value={step.strategy}
                    onChange={(e) => setAssignmentSteps((prev) => prev.map((s, i) =>
                      i === idx ? { ...s, strategy: e.target.value as AssignmentStrategy } : s
                    ))}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta.description}</p>
                </div>

                {/* Enabled toggle */}
                <input
                  type="checkbox"
                  checked={step.enabled}
                  onChange={(e) => setAssignmentSteps((prev) => prev.map((s, i) =>
                    i === idx ? { ...s, enabled: e.target.checked } : s
                  ))}
                  title="Abilita/disabilita questo criterio"
                  className="h-4 w-4 shrink-0 cursor-pointer"
                />

                {/* Move up/down */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    disabled={idx === 0}
                    onClick={() => setAssignmentSteps((prev) => {
                      const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return next;
                    })}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    disabled={idx === assignmentSteps.length - 1}
                    onClick={() => setAssignmentSteps((prev) => {
                      const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return next;
                    })}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => setAssignmentSteps((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Drug priority rules panel */}
              {step.strategy === "drug_priority" && (
                <DrugPriorityRulesPanel
                  rules={drugPriorityRules}
                  drugs={drugOptions}
                  categories={categoryOptions}
                  onAdd={handleAddDrugPriorityRule}
                  onUpdate={handleUpdateDrugPriorityRule}
                  onDelete={handleDeleteDrugPriorityRule}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Add criterion */}
      <button
        onClick={() => setAssignmentSteps((prev) => [
          ...prev,
          { strategy: "fifo", logic_op: "AND", enabled: true },
        ])}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="h-4 w-4" /> Aggiungi criterio
      </button>

      <div className="pt-1">
        <Button onClick={handleSaveStrategy} disabled={savingStrategy || assignmentSteps.length === 0}>
          {savingStrategy ? "Salvataggio..." : "Salva strategia"}
        </Button>
      </div>
    </div>
  );
}
