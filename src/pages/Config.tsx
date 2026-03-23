import { useSearchParams } from "react-router-dom";
import { Settings, ShieldCheck } from "lucide-react";
import Navbar from "@/components/dashboard/Navbar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import ProcessConfigTab from "@/components/dashboard/ProcessConfigTab";
import { CappeTab } from "@/components/config/CappeTab";
import { FarmaciTab } from "@/components/config/FarmaciTab";
import { ContenitoriTab } from "@/components/config/ContenitoriTab";
import { AssignmentTab } from "@/components/config/AssignmentTab";

export default function Config() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "cappe";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Configurazione sistema</h1>
            <p className="text-sm text-muted-foreground">Gestione cappe e strategie di assegnazione</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2.5 py-1.5 rounded-md">
            <ShieldCheck className="h-3.5 w-3.5" />
            Area riservata agli amministratori
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const p = new URLSearchParams(searchParams);
            p.set("tab", v);
            window.history.replaceState(null, "", `?${p}`);
          }}
        >
          <TabsContent value="cappe">
            <CappeTab />
          </TabsContent>

          <TabsContent value="farmaci" className="space-y-5">
            <FarmaciTab />
          </TabsContent>

          <TabsContent value="contenitori" className="space-y-5">
            <ContenitoriTab />
          </TabsContent>

          <TabsContent value="assignment">
            <AssignmentTab />
          </TabsContent>

          <TabsContent value="processi">
            <ProcessConfigTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
