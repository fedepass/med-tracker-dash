// ─── Shared types for Config module ──────────────────────────────────────────

export type Tipologia = "biologica" | "chimica" | "sterile" | "custom";
export type RuleType = "excluded" | "mandatory";
export type AssignmentStrategy =
  | "fifo"
  | "lifo"
  | "urgency"
  | "round_robin"
  | "load_balance"
  | "drug_priority";

export interface AssignmentStepConfig {
  strategy: AssignmentStrategy;
  logic_op: "AND" | "OR";
  enabled: boolean;
}

export interface DrugPriorityRule {
  id?: number;
  rule_type: "drug" | "category";
  value: string;
  priority: number;
  enabled: boolean;
}

export interface DrugRule {
  id: number;
  cappaId: number;
  drugName: string | null;
  category: string | null;
  ruleType: RuleType;
}

export interface Cappa {
  id: number;
  name: string;
  tipologia: Tipologia;
  description: string | null;
  active: boolean;
  drugRules: DrugRule[];
}

export interface Drug {
  id: number;
  name: string;
  code: string | null;
  aic_code: string | null;
  category: string | null;
  is_powder: boolean;
  diluent: string | null;
  reconstitution_volume: number | null;
  reconstitution_volume_unit: string | null;
  specific_gravity: number | null;
  vial_volume: number | null;
  needs_review: boolean;
  process_config_id: number | null;
}

export interface ProcessConfig {
  id: number;
  name: string;
}

export interface Container {
  id: number;
  name: string;
  volume_ml: number | null;
  solvent: string | null;
  container_type: string | null;
  enabled: boolean;
  needs_review: boolean;
}
