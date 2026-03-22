import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extFetch } from "@/lib/apiClient";

interface RejectDialogProps {
  open: boolean;
  preparationIds: string[];
  defaultReason?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const RejectDialog = ({ open, preparationIds, defaultReason, onConfirm, onCancel }: RejectDialogProps) => {
  const [reason, setReason] = useState<string>(defaultReason ?? "");
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([]);

  useEffect(() => {
    extFetch("/rejection-reasons")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setReasons(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setReason(defaultReason ?? "");
  }, [open, defaultReason]);

  const handleConfirm = () => {
    if (reason) {
      onConfirm(reason);
      setReason("");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onCancel();
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rifiuta Preparazion{preparationIds.length > 1 ? "i" : "e"}</DialogTitle>
          <DialogDescription>
            Seleziona il motivo del rifiuto per {preparationIds.length > 1 ? `${preparationIds.length} preparazioni` : preparationIds[0]}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona motivo..." />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {reasons.map((r) => (
                <SelectItem key={r.id} value={r.reason}>
                  {r.reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason}>
            Conferma Rifiuto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectDialog;
