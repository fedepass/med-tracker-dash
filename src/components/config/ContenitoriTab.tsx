import { useState, useCallback, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { extFetch } from "@/lib/apiClient";
import { ContainerDialog } from "./ContainerDialog";
import type { Container } from "./types";

export function ContenitoriTab() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [containerDialogOpen, setContainerDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await extFetch(`/config/containers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContainers(await res.json());
    } catch {
      toast.error("Impossibile caricare i contenitori");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const handleSaveContainer = async (data: Omit<Container, "id">) => {
    try {
      if (editingContainer) {
        const res = await extFetch(`/config/containers/${editingContainer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setContainers((prev) => prev.map((c) => c.id === editingContainer.id ? { ...c, ...data } : c));
        toast.success("Contenitore aggiornato");
      } else {
        const res = await extFetch(`/config/containers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created: Container = await res.json();
        setContainers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Contenitore aggiunto al catalogo");
      }
    } catch (err: unknown) {
      toast.error("Errore nel salvataggio", { description: String(err) });
    } finally {
      setContainerDialogOpen(false);
      setEditingContainer(null);
    }
  };

  const handleDeleteContainer = async (id: number) => {
    try {
      const res = await extFetch(`/config/containers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContainers((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contenitore rimosso");
    } catch (err: unknown) {
      toast.error("Errore nella rimozione", { description: String(err) });
    }
  };

  const handleApproveContainer = async (id: number) => {
    try {
      const res = await extFetch(`/config/containers/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContainers((prev) => prev.map((c) => c.id === id ? { ...c, needs_review: false } : c));
      toast.success("Contenitore verificato");
    } catch (err: unknown) {
      toast.error("Errore nella verifica", { description: String(err) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold">Catalogo contenitori</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sacche, siringhe e flaconi usati come contenitore finale.</p>
        </div>
        <Button size="sm" className="h-8 text-xs" onClick={() => { setEditingContainer(null); setContainerDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Aggiungi contenitore
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Caricamento...</div>
      ) : containers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm mb-3">Catalogo contenitori vuoto</p>
            <Button size="sm" onClick={() => { setEditingContainer(null); setContainerDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Aggiungi il primo contenitore
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Volume</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Solvente</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Attivo</th>
                <th className="px-3 py-1.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {containers.map((c) => (
                <tr key={c.id} className={c.needs_review ? "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/40 transition-colors border-l-2 border-yellow-400" : "hover:bg-muted/20 transition-colors"}>
                  <td className="px-3 py-1.5 font-medium text-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      {c.name}
                      {c.needs_review && (
                        <span className="text-[10px] font-semibold px-1 py-px rounded bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 shrink-0">
                          DA VERIF.
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs font-mono text-muted-foreground">
                    {c.volume_ml != null ? `${c.volume_ml} ml` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.solvent ?? "—"}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {c.container_type
                      ? <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-px">{c.container_type}</Badge>
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {c.enabled
                      ? <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                      : <X className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      {c.needs_review && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-600 hover:text-green-600"
                          title="Segna come verificato"
                          onClick={() => handleApproveContainer(c.id)}>
                          <ShieldCheck className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => { setEditingContainer(c); setContainerDialogOpen(true); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteContainer(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {containers.length} contenitor{containers.length === 1 ? "e" : "i"}
          </div>
        </div>
      )}

      <ContainerDialog
        open={containerDialogOpen}
        onClose={() => { setContainerDialogOpen(false); setEditingContainer(null); }}
        onSave={handleSaveContainer}
        initial={editingContainer ?? undefined}
        title={editingContainer ? "Modifica contenitore" : "Nuovo contenitore"}
      />
    </div>
  );
}
