import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Container } from "./types";

export interface ContainerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Container, "id">) => void;
  initial?: Container;
  title: string;
}

export function ContainerDialog({ open, onClose, onSave, initial, title }: ContainerDialogProps) {
  const [name,          setName]          = useState(initial?.name ?? "");
  const [volumeMl,      setVolumeMl]      = useState(initial?.volume_ml?.toString() ?? "");
  const [solvent,       setSolvent]       = useState(initial?.solvent ?? "");
  const [containerType, setContainerType] = useState(initial?.container_type ?? "");
  const [enabled,       setEnabled]       = useState(initial?.enabled ?? true);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setVolumeMl(initial?.volume_ml?.toString() ?? "");
      setSolvent(initial?.solvent ?? "");
      setContainerType(initial?.container_type ?? "");
      setEnabled(initial?.enabled ?? true);
    }
  }, [open, initial]);

  const handleSave = () => {
    onSave({
      name: name.trim(),
      volume_ml: volumeMl ? parseFloat(volumeMl) : null,
      solvent:   solvent.trim() || null,
      container_type: containerType.trim() || null,
      enabled,
      needs_review: initial?.needs_review ?? false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Definisci il contenitore (sacca, siringa, flacone) usato come diluente finale.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome *</Label>
            <Input className="h-8 text-sm" placeholder="es. Sacca NaCl 0.9% 100 ml" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Volume (ml)</Label>
              <Input className="h-8 text-sm" type="number" placeholder="100" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={containerType || "none"} onValueChange={(v) => setContainerType(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">— Seleziona —</span></SelectItem>
                  <SelectItem value="sacca">Sacca IV</SelectItem>
                  <SelectItem value="siringa">Siringa</SelectItem>
                  <SelectItem value="flacone">Flacone</SelectItem>
                  <SelectItem value="fiala">Fiala</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Solvente</Label>
            <Select value={solvent || "none"} onValueChange={(v) => setSolvent(v === "none" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none"><span className="text-muted-foreground">— Seleziona —</span></SelectItem>
                <SelectItem value="NaCl 0.9%">NaCl 0.9%</SelectItem>
                <SelectItem value="NaCl 0.45%">NaCl 0.45%</SelectItem>
                <SelectItem value="Glucosio 5%">Glucosio 5%</SelectItem>
                <SelectItem value="Glucosio 10%">Glucosio 10%</SelectItem>
                <SelectItem value="Ringer lattato">Ringer lattato</SelectItem>
                <SelectItem value="APPI">Acqua per preparazioni iniettabili</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cont-enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
            <Label htmlFor="cont-enabled" className="text-xs cursor-pointer">Contenitore attivo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
