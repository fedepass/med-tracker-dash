import { useState } from "react";
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
import { rejectionReasons, type RejectionReason } from "@/context/PreparationsContext";

interface RejectDialogProps {
  open: boolean;
  preparationIds: string[];
  onConfirm: (reason: RejectionReason) => void;
  onCancel: () => void;
}

const RejectDialog = ({ open, preparationIds, onConfirm, onCancel }: RejectDialogProps) => {
  const [reason, setReason] = useState<RejectionReason | "">("");

  const handleConfirm = () => {
    if (reason) {
      onConfirm(reason as RejectionReason);
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
        <Select value={reason} onValueChange={(v) => setReason(v as RejectionReason)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona motivo..." />
          </SelectTrigger>
          <SelectContent>
            {rejectionReasons.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
