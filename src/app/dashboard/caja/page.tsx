import { getActiveCashSession, getCashSessionHistory } from "@/services/cash.service";
import { getSession } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { Coins, Landmark } from "lucide-react";
import { CajaClientPage } from "./CajaClientPage";

export default async function CajaPage() {
  const { user, tenantId } = await getSession();
  if (!user || !tenantId) {
    redirect("/");
  }

  const activeSession = await getActiveCashSession();
  const history = await getCashSessionHistory();

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary" /> Control de Caja
        </h1>
        <p className="text-muted-foreground text-sm">
          Establece tu base inicial, monitorea el dinero acumulado y realiza arqueos de caja diarios.
        </p>
      </div>

      <CajaClientPage 
        activeSession={activeSession}
        history={history}
      />
    </div>
  );
}
