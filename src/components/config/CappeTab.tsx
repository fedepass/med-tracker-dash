import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extFetch } from "@/lib/apiClient";
import { CappaDialog, DrugRuleRow } from "./CappaDialog";
import type { Cappa, Tipologia, RuleType, DrugRule } from "./types";

function CappaCard({
  cappa,
  onEdit,
  onDelete,
  onToggleActive,
  onDeleteDrugRule,
}: {
  cappa: Cappa;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDeleteDrugRule: (ruleId: number) => void;
}) {
  const tipologiaBadge: Record<Tipologia, string> = {
    sterile:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    biologica: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    chimica:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    custom:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <Card className={cn("transition-opacity", !cappa.active && "opacity-60")}>
      <div className="pb-3 p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold">{cappa.name}</span>
              <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-md capitalize", tipologiaBadge[cappa.tipologia])}>
                {cappa.tipologia}
              </span>
              {!cappa.active && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Disabilitata
                </span>
              )}
            </div>
            {cappa.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{cappa.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Modifica">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", cappa.active ? "text-muted-foreground hover:text-destructive" : "text-green-600 hover:text-green-700")}
              onClick={onToggleActive}
              title={cappa.active ? "Disabilita" : "Abilita"}
            >
              {cappa.active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Elimina"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {cappa.drugRules.length > 0 && (
        <CardContent className="pt-0 space-y-1.5">
          {cappa.drugRules.map((rule) => (
            <DrugRuleRow key={rule.id} rule={rule} onDelete={() => onDeleteDrugRule(rule.id)} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function CappeTab() {
  const [cappe, setCappe] = useState<Cappa[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [drugPrincipi, setDrugPrincipi] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCappa, setEditingCappa] = useState<Cappa | null>(null);

  const fetchCappe = useCallback(async () => {
    try {
      const res = await extFetch(`/cappe`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: any[] = await res.json();
      const data: Cappa[] = raw.map((c: any) => ({
        id:          c.id,
        name:        c.name,
        tipologia:   c.tipologia,
        description: c.description ?? null,
        active:      c.active,
        drugRules: (c.drug_rules ?? c.drugRules ?? []).map((r: any) => ({
          id:       r.id,
          cappaId:  r.cappa_id  ?? r.cappaId,
          drugName: r.drug_name ?? r.drugName ?? null,
          category: r.category  ?? null,
          ruleType: r.rule_type ?? r.ruleType,
        })),
      }));
      setCappe(data);
    } catch {
      toast.error("Impossibile caricare le cappe");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await extFetch(`/drugs/categories`);
      if (res.ok) {
        const data: { id: number; name: string }[] = await res.json();
        setCategories(data.map((c) => c.name));
      }
    } catch { /* silenzioso */ }
  }, []);

  const fetchDrugPrincipi = useCallback(async () => {
    try {
      const res = await extFetch(`/config/drugs`);
      if (res.ok) {
        const data: { id: number; name: string; active_ingredient: string | null }[] = await res.json();
        const principi = Array.from(
          new Set(data.map((d) => d.active_ingredient || d.name).filter(Boolean))
        ).sort() as string[];
        setDrugPrincipi(principi);
      }
    } catch { /* silenzioso */ }
  }, []);

  useEffect(() => {
    fetchCappe();
    fetchCategories();
    fetchDrugPrincipi();
  }, [fetchCappe, fetchCategories, fetchDrugPrincipi]);

  const handleDeleteCappa = async (id: number) => {
    try {
      const res = await extFetch(`/config/cappe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cappa eliminata");
    } catch (err: unknown) {
      toast.error("Errore nell'eliminazione", { description: String(err) });
    }
  };

  const handleToggleActive = async (cappa: Cappa) => {
    try {
      const res = await extFetch(`/config/cappe/${cappa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cappa.name, tipologia: cappa.tipologia, description: cappa.description, active: !cappa.active }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.map((c) => c.id === cappa.id ? { ...c, active: !cappa.active } : c));
    } catch (err: unknown) {
      toast.error("Errore nell'aggiornamento", { description: String(err) });
    }
  };

  const handleDeleteDrugRule = async (ruleId: number, cappaId: number) => {
    try {
      const res = await extFetch(`/config/drug-rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCappe((prev) => prev.map((c) => c.id === cappaId ? { ...c, drugRules: c.drugRules.filter((r) => r.id !== ruleId) } : c));
    } catch (err: unknown) {
      toast.error("Errore nell'eliminazione della regola", { description: String(err) });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Definisci le cappe della farmacia, la loro tipologia e le regole sui farmaci.
        </p>
        <Button
          size="sm"
          onClick={() => { setEditingCappa(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Aggiungi cappa
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Caricamento...</div>
      ) : cappe.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">Nessuna cappa configurata</p>
            <Button size="sm" onClick={() => { setEditingCappa(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Aggiungi la prima cappa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cappe.map((cappa) => (
            <CappaCard
              key={cappa.id}
              cappa={cappa}
              onEdit={() => { setEditingCappa(cappa); setDialogOpen(true); }}
              onDelete={() => handleDeleteCappa(cappa.id)}
              onToggleActive={() => handleToggleActive(cappa)}
              onDeleteDrugRule={(ruleId) => handleDeleteDrugRule(ruleId, cappa.id)}
            />
          ))}
        </div>
      )}

      <CappaDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCappa(null); }}
        onSaved={() => { fetchCappe(); setDialogOpen(false); setEditingCappa(null); }}
        initial={editingCappa ?? undefined}
        categories={categories}
        drugs={drugPrincipi}
        title={editingCappa ? "Modifica cappa" : "Nuova cappa"}
      />
    </>
  );
}
