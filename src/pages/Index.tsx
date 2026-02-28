import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CalendarCheck, ClipboardList, Archive, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/dashboard/Navbar";
import StatCards from "@/components/dashboard/StatCards";
import PreparationsTable from "@/components/dashboard/PreparationsTable";
import { usePreparations } from "@/context/PreparationsContext";
import type { Status } from "@/data/preparations";

const activeStatuses: Status[] = ["completata", "esecuzione", "errore", "attesa"];
const archivedStatuses: Status[] = ["validata", "rifiutata"];
const validStatuses: Status[] = [...activeStatuses, ...archivedStatuses];
const todayStr = () => format(new Date(), "yyyy-MM-dd");

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { preparations } = usePreparations();

  const tab = searchParams.get("tab") === "archivio" ? "archivio" : "da-valutare";

  const rawStatus = searchParams.get("status");
  const statusFilter: Status | null =
    rawStatus && validStatuses.includes(rawStatus as Status) ? (rawStatus as Status) : null;

  // Date range — default: today → today
  const rawFrom = searchParams.get("dateFrom");
  const rawTo = searchParams.get("dateTo");
  const dateFrom: Date = rawFrom ? new Date(rawFrom + "T00:00:00") : new Date();
  const dateTo: Date = rawTo ? new Date(rawTo + "T00:00:00") : new Date();
  const dateFromStr = format(dateFrom, "yyyy-MM-dd");
  const dateToStr = format(dateTo, "yyyy-MM-dd");

  const setDateRange = (from: Date | undefined, to: Date | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (from) next.set("dateFrom", format(from, "yyyy-MM-dd")); else next.delete("dateFrom");
        if (to) next.set("dateTo", format(to, "yyyy-MM-dd")); else next.delete("dateTo");
        return next;
      },
      { replace: true }
    );
  };

  const setToday = () => {
    const now = new Date();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const t = format(now, "yyyy-MM-dd");
        next.set("dateFrom", t);
        next.set("dateTo", t);
        return next;
      },
      { replace: true }
    );
  };

  const setTab = (t: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", t);
        next.delete("status");
        return next;
      },
      { replace: true }
    );
  };

  const setStatusFilter = (s: Status | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (s) next.set("status", s);
        else next.delete("status");
        return next;
      },
      { replace: true }
    );
  };

  const isToday =
    dateFromStr === todayStr() && dateToStr === todayStr();

  const activeRangePreps = preparations.filter(
    (p) => p.date >= dateFromStr && p.date <= dateToStr && activeStatuses.includes(p.status)
  );
  const archivedRangePreps = preparations.filter(
    (p) => p.date >= dateFromStr && p.date <= dateToStr && archivedStatuses.includes(p.status)
  );
  const validatedCount = archivedRangePreps.filter((p) => p.status === "validata").length;
  const rejectedCount = archivedRangePreps.filter((p) => p.status === "rifiutata").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Preparazioni</h1>
            <p className="text-sm text-muted-foreground">
              Supervisione e validazione delle preparazioni farmaceutiche
            </p>
          </div>

          {/* Date range controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Oggi button */}
            <Button
              variant={isToday ? "default" : "outline"}
              size="sm"
              onClick={setToday}
              className="gap-1.5"
            >
              <CalendarCheck className="h-4 w-4" />
              Oggi
            </Button>

            <span className="text-xs text-muted-foreground font-medium">Da</span>

            {/* From picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateFrom, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => d && setDateRange(d, dateTo < d ? d : dateTo)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground text-sm">→</span>

            <span className="text-xs text-muted-foreground font-medium">A</span>

            {/* To picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateTo, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => d && setDateRange(dateFrom > d ? d : dateFrom, d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 rounded-xl border border-border bg-muted/40 p-1.5 sm:inline-flex sm:w-auto">
            <TabsTrigger
              value="da-valutare"
              className="gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ClipboardList className="h-4 w-4" />
              <span>Da Valutare</span>
              <Badge
                className={cn(
                  "ml-0.5 h-5 px-1.5 text-xs transition-colors",
                  tab === "da-valutare"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {activeRangePreps.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="archivio"
              className="gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Archive className="h-4 w-4" />
              <span>Archivio</span>
              <Badge
                className={cn(
                  "ml-0.5 h-5 px-1.5 text-xs transition-colors",
                  tab === "archivio"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {archivedRangePreps.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Da Valutare ── */}
          <TabsContent value="da-valutare" className="mt-0 space-y-6">
            <StatCards
              activeStatus={statusFilter}
              onStatusClick={(s) => setStatusFilter(statusFilter === s ? null : s)}
              dateFrom={dateFromStr}
              dateTo={dateToStr}
            />
            <PreparationsTable
              mode="active"
              statusFilter={statusFilter}
              dateFrom={dateFromStr}
              dateTo={dateToStr}
            />
          </TabsContent>

          {/* ── Tab: Archivio ── */}
          <TabsContent value="archivio" className="mt-0 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => setStatusFilter(statusFilter === "validata" ? null : "validata")}
                className={cn(
                  "flex flex-1 items-center gap-4 rounded-xl border-2 bg-card p-5 shadow-sm transition-all hover:shadow-md text-left",
                  statusFilter === "validata"
                    ? "border-status-complete text-status-complete"
                    : "border-border"
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-status-complete-bg">
                  <ShieldCheck className="h-6 w-6 text-status-complete" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{validatedCount}</p>
                  <p className="text-sm text-muted-foreground">Validate</p>
                </div>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "rifiutata" ? null : "rifiutata")}
                className={cn(
                  "flex flex-1 items-center gap-4 rounded-xl border-2 bg-card p-5 shadow-sm transition-all hover:shadow-md text-left",
                  statusFilter === "rifiutata"
                    ? "border-status-error text-status-error"
                    : "border-border"
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-status-error-bg">
                  <ShieldX className="h-6 w-6 text-status-error" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">Rifiutate</p>
                </div>
              </button>
            </div>
            <PreparationsTable
              mode="archived"
              statusFilter={statusFilter}
              dateFrom={dateFromStr}
              dateTo={dateToStr}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
