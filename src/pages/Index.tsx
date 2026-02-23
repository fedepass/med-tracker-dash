import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/dashboard/Navbar";
import StatCards from "@/components/dashboard/StatCards";
import PreparationsTable from "@/components/dashboard/PreparationsTable";
import type { Status } from "@/data/preparations";

const Index = () => {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

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
          <div className="flex gap-2">
            <Button className="gap-2 bg-status-complete text-primary-foreground hover:bg-status-complete/90">
              <CheckCircle2 className="h-4 w-4" />
              Valida Selezionate
            </Button>
            <Button variant="destructive" className="gap-2">
              <X className="h-4 w-4" />
              Rifiuta Selezionate
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <StatCards activeStatus={statusFilter} onStatusClick={(s) => setStatusFilter(statusFilter === s ? null : s === null ? null : s)} />
        </div>

        {/* Table */}
        <PreparationsTable statusFilter={statusFilter} />
      </main>
    </div>
  );
};

export default Index;
