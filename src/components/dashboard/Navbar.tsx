import { Search, Barcode, BarChart3, Home, ListChecks, ScanLine, Settings, ChevronDown, Wind, Pill, Shuffle, Cpu, TrendingUp, Menu, X as XIcon, ChevronRight, FlaskConical } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePreparations } from "@/context/PreparationsContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CONFIG_ITEMS = [
  { label: "Cappe LAF",            tab: "cappe",        icon: Wind,         desc: "Gestione cappe e regole" },
  { label: "Farmaci",              tab: "farmaci",      icon: Pill,         desc: "Catalogo farmaci" },
  { label: "Contenitori",          tab: "contenitori",  icon: FlaskConical, desc: "Sacche, siringhe, flaconi" },
  { label: "Strategia assegnazione", tab: "assignment", icon: Shuffle,      desc: "Priorità e bilanciamento" },
  { label: "Processi",             tab: "processi",     icon: Cpu,          desc: "Configurazione processi" },
];

const ANALYTICS_ITEMS = [
  { label: "Dashboard Analytics",  to: "/analytics",  icon: TrendingUp, desc: "Statistiche e grafici" },
];

function DropdownPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 mt-1.5 min-w-[220px] rounded-xl border border-border bg-popover shadow-lg shadow-black/10 z-50 overflow-hidden",
        "transition-all duration-150 origin-top-left",
        open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      )}
    >
      {children}
    </div>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

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
  const [openMenu, setOpenMenu] = useState<"analytics" | "config" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"analytics" | "config" | null>(null);

  const analyticsRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === "/";
  const isAnalytics = location.pathname === "/analytics";
  const isConfig = location.pathname === "/config";

  // Chiudi dropdown al click esterno
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        analyticsRef.current && !analyticsRef.current.contains(e.target as Node) &&
        configRef.current && !configRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Chiudi dropdown al cambio di route
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  }, [location.pathname, location.search]);

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

              <div className="relative" ref={analyticsRef}>
              <button
                onClick={() => setOpenMenu(openMenu === "analytics" ? null : "analytics")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isAnalytics ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", openMenu === "analytics" && "rotate-180")} />
              </button>

              <DropdownPanel open={openMenu === "analytics"}>
                <div className="p-1.5">
                  {ANALYTICS_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                    >
                      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors",
                        isAnalytics && "border-primary/30 bg-primary/5")}>
                        <item.icon className={cn("h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors", isAnalytics && "text-primary")} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-medium", isAnalytics ? "text-primary" : "text-foreground")}>{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </DropdownPanel>
            </div>

            {isAdmin && (
              <div className="relative" ref={configRef}>
                <button
                  onClick={() => setOpenMenu(openMenu === "config" ? null : "config")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isConfig ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Configurazione
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", openMenu === "config" && "rotate-180")} />
                </button>

                <DropdownPanel open={openMenu === "config"}>
                  <div className="px-3 pt-2.5 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Configurazione sistema</p>
                  </div>
                  <div className="p-1.5 pt-1">
                    {CONFIG_ITEMS.map((item) => {
                      const active = isConfig && location.search.includes(`tab=${item.tab}`);
                      return (
                        <Link
                          key={item.tab}
                          to={`/config?tab=${item.tab}`}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                        >
                          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors",
                            active && "border-primary/30 bg-primary/5")}>
                            <item.icon className={cn("h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors", active && "text-primary")} />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-xs font-medium", active ? "text-primary" : "text-foreground")}>{item.label}</p>
                            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </DropdownPanel>
              </div>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2">
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

          {barcodeMode === "select" && tableSelected.size > 0 && (
            <div className="rounded-lg bg-primary/10 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-primary">{tableSelected.size} selezionate</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground">{displayName ?? 'Utente'}</p>
              <p className="text-xs text-muted-foreground">{role === 'admin' ? 'Amministratore' : 'Operatore'}</p>
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-navbar">
          <nav className="flex flex-col p-3 gap-0.5">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isHome ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Home className="h-4 w-4 shrink-0" /> Preparazioni
            </Link>

            <button
              onClick={() => setMobileSection(mobileSection === "analytics" ? null : "analytics")}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
                isAnalytics ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="flex-1">Analytics</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", mobileSection === "analytics" && "rotate-180")} />
            </button>
            {mobileSection === "analytics" && (
              <div className="ml-4 pl-3 border-l border-border flex flex-col gap-0.5 mt-0.5 mb-1">
                {ANALYTICS_ITEMS.map((item) => (
                  <Link key={item.to} to={item.to}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setMobileSection(mobileSection === "config" ? null : "config")}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
                    isConfig ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Configurazione</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", mobileSection === "config" && "rotate-180")} />
                </button>
                {mobileSection === "config" && (
                  <div className="ml-4 pl-3 border-l border-border flex flex-col gap-0.5 mt-0.5 mb-1">
                    {CONFIG_ITEMS.map((item) => {
                      const active = isConfig && location.search.includes(`tab=${item.tab}`);
                      return (
                        <Link key={item.tab} to={`/config?tab=${item.tab}`}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                            active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="mt-2 pt-2 border-t border-border px-3 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{displayName ?? 'Utente'}</p>
                <p className="text-xs text-muted-foreground">{role === 'admin' ? 'Amministratore' : 'Operatore'}</p>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
