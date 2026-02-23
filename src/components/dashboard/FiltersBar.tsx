import { Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const FiltersBar = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filtri e Ordinamento
        </div>
        <button className="text-sm text-primary hover:underline">Ripristina filtri</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Stato</label>
          <Select defaultValue="tutti">
            <SelectTrigger className="h-9 bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="attesa">In Attesa</SelectItem>
              <SelectItem value="esecuzione">In Esecuzione</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="errore">Errore</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Priorità</label>
          <Select defaultValue="tutte">
            <SelectTrigger className="h-9 bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutte">Tutte</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="bassa">Bassa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Esecutore</label>
          <Select defaultValue="tutti">
            <SelectTrigger className="h-9 bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="bianchi">L. Bianchi</SelectItem>
              <SelectItem value="verdi">M. Verdi</SelectItem>
              <SelectItem value="neri">G. Neri</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Farmaco</label>
          <Input placeholder="Cerca farmaco..." className="h-9 bg-secondary" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Ordina per</label>
          <Select defaultValue="data">
            <SelectTrigger className="h-9 bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Data richiesta</SelectItem>
              <SelectItem value="priorita">Priorità</SelectItem>
              <SelectItem value="stato">Stato</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
