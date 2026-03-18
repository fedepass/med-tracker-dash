import { Search, Barcode, BarChart3, Home, ListChecks, ScanLine, Settings } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePreparations } from "@/context/PreparationsContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, displayName, role } = useAuth();
  const {
    preparations,
    barcodeMode, toggleBarcodeMode,
    barcodeSelectedIds, addBarcodeSelection, clearBarcodeSelection,
    tableSelected,
  } = usePreparations();
  const [barcodeValue, setBarcodeValue] = useState("");
  const isAnalytics = location.pathname === "/analytics";
  const isHome = location.pathname === "/";
  const isConfig = location.pathname === "/config";

  const handleBarcodeSearch = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    const match = preparations.find((p) => p.id.toUpperCase() === trimmed);
    if (match) {
      setBarcodeValue("");
      const isArchived = match.status === "validata" || match.status === "rifiutata";
      if (barcodeMode === "detail") {
        navigate(`/preparation/${match.id}`);
      } else {
        if (isArchived) {
          toast.warning(`${match.id} già ${match.status}`, {
            description: "Questa preparazione è già stata archiviata e non può essere selezionata",
            duration: 4000,
            style: { background: "hsl(38, 92%, 50%)", color: "white", border: "none", fontSize: "0.95rem", fontWeight: "600" },
            classNames: { description: "!text-white !opacity-90" },
          });
        } else if (tableSelected.has(match.id)) {
          toast.warning(`${match.id} già in lista`, {
            description: "Questa preparazione è già stata selezionata",
            duration: 4000,
            style: { background: "hsl(38, 92%, 50%)", color: "white", border: "none", fontSize: "0.95rem", fontWeight: "600" },
            classNames: { description: "!text-white !opacity-90" },
          });
        } else {
          addBarcodeSelection(match.id);
          toast.success(`${match.id} aggiunto alla selezione`, { duration: 2000 });
        }
      }
    } else {
      toast.error("Preparazione non trovata", {
        description: `Nessun ID "${trimmed}" presente nel sistema`,
        duration: 5000,
        style: { background: "hsl(0, 72%, 50%)", color: "white", border: "none", fontSize: "0.95rem", fontWeight: "600" },
        classNames: { description: "!text-white !opacity-90" },
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-navbar-border bg-navbar">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">💊</span>
            </div>
            <span className="text-lg font-semibold text-foreground">PharmAR System</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isHome ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Home className="h-4 w-4" /> Preparazioni
            </Link>
            <Link
              to="/analytics"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isAnalytics ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
            {isAdmin && (
              <Link
                to="/config"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isConfig ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Settings className="h-4 w-4" /> Configurazione
              </Link>
            )}
          </nav>
        </div>

        {/* Barcode search */}
        <div className="hidden md:flex items-center gap-2">
          {/* Mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleBarcodeMode}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg border transition-colors",
                  barcodeMode === "select"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {barcodeMode === "select" ? <ListChecks className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {barcodeMode === "select" ? "Modalità selezione multipla — clicca per tornare al dettaglio" : "Modalità dettaglio — clicca per selezione multipla"}
            </TooltipContent>
          </Tooltip>

          {/* Input */}
          <div className="relative w-72">
            <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={barcodeMode === "select" ? "Scansiona per aggiungere alla lista..." : "Scansiona o inserisci barcode..."}
              className={cn(
                "h-10 pl-10 pr-10 border-border",
                barcodeMode === "select" ? "bg-primary/5 border-primary/40" : "bg-secondary"
              )}
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSearch(barcodeValue); }}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Badge contatore + clear (solo in modalità select) */}
          {barcodeMode === "select" && tableSelected.size > 0 && (
            <div className="rounded-lg bg-primary/10 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-primary">{tableSelected.size} selezionate</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {displayName ? displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground">{displayName ?? 'Utente'}</p>
              <p className="text-xs text-muted-foreground">{role === 'admin' ? 'Amministratore' : 'Operatore'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
