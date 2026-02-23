import { useState, useMemo } from "react";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, TrendingUp, BarChart3, Monitor, AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreparations } from "@/context/PreparationsContext";
import Navbar from "@/components/dashboard/Navbar";
import type { Status, Priority } from "@/data/preparations";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const STATUS_COLORS: Record<Status, string> = {
  attesa: "hsl(215, 80%, 52%)",
  esecuzione: "hsl(36, 90%, 52%)",
  completata: "hsl(152, 60%, 44%)",
  errore: "hsl(0, 72%, 56%)",
  validata: "hsl(152, 80%, 36%)",
  rifiutata: "hsl(0, 50%, 44%)",
};

const STATUS_LABELS: Record<Status, string> = {
  attesa: "In Attesa",
  esecuzione: "In Esecuzione",
  completata: "Completata",
  errore: "Errore",
  validata: "Validata",
  rifiutata: "Rifiutata",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  alta: "hsl(0, 72%, 56%)",
  media: "hsl(36, 90%, 52%)",
  bassa: "hsl(152, 60%, 44%)",
};

const Analytics = () => {
  const { preparations } = usePreparations();

  // Date range – default: today
  const today = new Date();
  const [from, setFrom] = useState<Date>(today);
  const [to, setTo] = useState<Date>(today);

  // Filtered data
  const filtered = useMemo(() => {
    return preparations.filter((p) => {
      const d = parseISO(p.date);
      return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(to) });
    });
  }, [preparations, from, to]);

  // --- Aggregations ---
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({
      name: STATUS_LABELS[status as Status] || status,
      value: count,
      color: STATUS_COLORS[status as Status] || "#888",
    }));
  }, [filtered]);

  const priorityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((p) => { map[p.priority] = (map[p.priority] || 0) + 1; });
    return Object.entries(map).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      color: PRIORITY_COLORS[priority as Priority] || "#888",
    }));
  }, [filtered]);

  const stationData = useMemo(() => {
    const map: Record<string, { total: number; completed: number; errors: number }> = {};
    filtered.forEach((p) => {
      const name = p.station || "Non assegnata";
      if (!map[name]) map[name] = { total: 0, completed: 0, errors: 0 };
      map[name].total++;
      if (p.status === "completata" || p.status === "validata") map[name].completed++;
      if (p.status === "errore") map[name].errors++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [filtered]);

  const avgErrorRate = useMemo(() => {
    if (!filtered.length) return 0;
    return filtered.reduce((sum, p) => sum + p.errorRate, 0) / filtered.length;
  }, [filtered]);

  const completionRate = useMemo(() => {
    if (!filtered.length) return 0;
    const done = filtered.filter((p) => p.status === "completata" || p.status === "validata").length;
    return (done / filtered.length) * 100;
  }, [filtered]);

  const typeCounts = useMemo(() => {
    const iv = filtered.filter((p) => p.prepType === "infusione_iv").length;
    const syr = filtered.filter((p) => p.prepType === "siringa_ricostituita").length;
    return [
      { name: "Infusione IV", value: iv, color: "hsl(215, 80%, 52%)" },
      { name: "Siringa", value: syr, color: "hsl(36, 90%, 52%)" },
    ];
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Report e analisi delle preparazioni farmaceutiche</p>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(from, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={from}
                  onSelect={(d) => d && setFrom(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(to, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={to}
                  onSelect={(d) => d && setTo(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Totale" value={filtered.length} color="text-primary" />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="In Attesa" value={filtered.filter((p) => p.status === "attesa").length} color="text-status-waiting" />
          <KpiCard icon={<Loader2 className="h-5 w-5" />} label="In Esecuzione" value={filtered.filter((p) => p.status === "esecuzione").length} color="text-status-progress" />
          <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completate" value={filtered.filter((p) => p.status === "completata" || p.status === "validata").length} color="text-status-complete" />
          <KpiCard icon={<XCircle className="h-5 w-5" />} label="Errori" value={filtered.filter((p) => p.status === "errore").length} color="text-status-error" />
          <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Err. Rate %" value={`${avgErrorRate.toFixed(1)}%`} color="text-destructive" />
        </div>

        {/* Charts row */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Status Pie */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribuzione per Stato</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority Pie */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribuzione per Priorità</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {priorityCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Type + Completion */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Tipo Preparazione & Tasso Completamento</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px] flex flex-col items-center justify-center gap-4">
              <div className="flex gap-6">
                {typeCounts.map((t) => (
                  <div key={t.name} className="text-center">
                    <div className="text-3xl font-bold" style={{ color: t.color }}>{t.value}</div>
                    <div className="text-xs text-muted-foreground">{t.name}</div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-status-complete">{completionRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Tasso di completamento</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Executor Bar Chart */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> Performance Postazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completate" fill="hsl(152, 60%, 44%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="errors" name="Errori" fill="hsl(0, 72%, 56%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Riepilogo Preparazioni</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Farmaco</TableHead>
                    <TableHead className="text-xs">Stato</TableHead>
                    <TableHead className="text-xs">Priorità</TableHead>
                    <TableHead className="text-xs text-right">Err %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="text-xs">
                      <TableCell className="font-mono">{p.id}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{p.drug}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: STATUS_COLORS[p.status], color: STATUS_COLORS[p.status] }}>
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: PRIORITY_COLORS[p.priority], color: PRIORITY_COLORS[p.priority] }}>
                          {p.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{p.errorRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nessuna preparazione nel periodo selezionato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const KpiCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => (
  <Card className="shadow-sm">
    <CardContent className="flex flex-col items-center justify-center py-4 gap-1">
      <div className={cn("mb-1", color)}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

export default Analytics;
