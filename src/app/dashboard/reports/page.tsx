import { BIHeader } from "@/components/reports/BIHeader";
import { KPISection } from "@/components/reports/KPISection";
import { StaffPerformance } from "@/components/reports/StaffPerformance";
import { ParetoSection } from "@/components/reports/ParetoSection";
import { InventoryOperations } from "@/components/reports/InventoryOperations";
import { Suspense } from "react";
import Loading from "../loading";
import { getBIAnalytics } from "@/services/analytics.service";
import { getSession } from "@/lib/supabase/session";


export default async function ReportsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ range?: string, date?: string }> 
}) {
  const { range = "month", date } = await searchParams;
  const { user, staff, activeRole } = await getSession();
  
  const authRole = user?.user_metadata?.role;
  let role = (authRole === "admin" || authRole === "superadmin")
    ? authRole
    : (staff?.role ?? authRole ?? "admin");

  // Si se inició sesión explícitamente como barbero usando PIN, aplicar el rol
  if (activeRole === "barber" && (role === "admin" || role === "superadmin" || staff?.role === "barber")) {
    role = "barber";
  } else if (activeRole === "admin" && (authRole === "admin" || authRole === "superadmin")) {
    role = authRole;
  }
  const staffId = role === "barber" ? staff.id : undefined;
  const data = await getBIAnalytics(range, date, staffId);

  if (!data) return <div>No se pudieron cargar los datos</div>;

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      <BIHeader currentRange={range} currentDate={date} />
      
      <Suspense fallback={<Loading />}>
        <div className="space-y-12">
          {/* Resumen Ejecutivo */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 ml-1">Resumen Ejecutivo</h2>
            <KPISection data={data.kpis} role={role} />
          </section>

          {/* Análisis de Personal */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 ml-1">Rendimiento del Staff</h2>
              <StaffPerformance data={data.staffPerformance} />
            </section>

            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 ml-1">Análisis de Pareto</h2>
              <ParetoSection data={data.paretoServices} topClients={data.topClients} />
            </section>
          </div>

          {/* Operaciones e Inventario */}
          {role !== "barber" && (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 ml-1">Operaciones e Inventario</h2>
              <InventoryOperations heatmap={data.heatmap} topProducts={data.topProducts} />
            </section>
          )}
        </div>
      </Suspense>
    </div>
  );
}
