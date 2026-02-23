import { useSearchParams } from "react-router-dom";
import { ShieldCheck, ShieldX, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Navbar from "@/components/dashboard/Navbar";
import StatCards from "@/components/dashboard/StatCards";
import PreparationsTable from "@/components/dashboard/PreparationsTable";
import type { Status } from "@/data/preparations";

const validStatuses: Status[] = ["completata", "esecuzione", "errore", "attesa", "validata", "rifiutata"];

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get("status");
  const statusFilter: Status | null = rawStatus && validStatuses.includes(rawStatus as Status) ? (rawStatus as Status) : null;
  const showArchived = searchParams.get("archived") === "1";

  // Date filter — default to today
  const rawDate = searchParams.get("date");
  const dateFilter: Date = rawDate ? new Date(rawDate + "T00:00:00") : new Date();
  const dateFilterStr = format(dateFilter, "yyyy-MM-dd");

  const setDateFilter = (d: Date | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (d) next.set("date", format(d, "yyyy-MM-dd")); else next.delete("date");
      return next;
    }, { replace: true });
  };

  const setStatusFilter = (s: Status | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s) next.set("status", s); else next.delete("status");
      return next;
    }, { replace: true });
  };

  const setShowArchived = (v: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("archived", "1"); else next.delete("archived");
      return next;
    }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Preparazioni</h1>
            <p className="text-sm text-muted-foreground">Supervisione e validazione delle preparazioni farmaceutiche</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateFilter, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} />
              <span className="text-sm text-muted-foreground">Mostra validate/rifiutate</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStatusFilter(statusFilter === "validata" ? null : "validata")}
              >
                <ShieldCheck className="h-4 w-4 text-status-complete" />
                Validate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStatusFilter(statusFilter === "rifiutata" ? null : "rifiutata")}
              >
                <ShieldX className="h-4 w-4 text-status-error" />
                Rifiutate
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <StatCards activeStatus={statusFilter} onStatusClick={(s) => setStatusFilter(statusFilter === s ? null : s === null ? null : s)} />
        </div>

        {/* Table */}
        <PreparationsTable statusFilter={statusFilter} showArchived={showArchived} dateFilter={dateFilterStr} />
      </main>
    </div>
  );
};

export default Index;
