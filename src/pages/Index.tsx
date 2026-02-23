import { useState } from "react";
import { CheckCircle2, X, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/dashboard/Navbar";
import StatCards from "@/components/dashboard/StatCards";
import PreparationsTable from "@/components/dashboard/PreparationsTable";
import type { Status } from "@/data/preparations";

const Index = () => {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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
          <div className="flex items-center gap-4">
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
        <PreparationsTable statusFilter={statusFilter} showArchived={showArchived} />
      </main>
    </div>
  );
};

export default Index;
