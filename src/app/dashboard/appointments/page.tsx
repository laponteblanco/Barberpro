import Link from "next/link";
import { Clock, LayoutList, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { NewAppointmentDialog } from "@/components/appointments/NewAppointmentDialog";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/appointments/CalendarView";
import { Suspense } from "react";
import { withTimeout } from "@/lib/performance";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { tenantId, staff: sessionStaff, user, activeRole } = await getSession();
  if (!tenantId) return <div>No se encontró la barbería. Por favor, inicia sesión.</div>;

  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] bg-background text-foreground animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Cargando Agenda...
        </p>
      </div>
    }>
      {searchParams.then(({ date }) => (
        <AppointmentsContent 
          dateParam={date} 
          tenantId={tenantId}
          sessionStaff={sessionStaff}
          user={user}
          activeRole={activeRole}
        />
      ))}
    </Suspense>
  );
}

async function AppointmentsContent({
  dateParam,
  tenantId,
  sessionStaff,
  user,
  activeRole
}: {
  dateParam?: string;
  tenantId: string;
  sessionStaff: any;
  user: any;
  activeRole: string | null;
}) {
  // Use Bogota time (UTC-5) for the default date if not provided
  const now = new Date();
  const bogotaTime = new Date(now.getTime() - (5 * 3600000));
  const bogotaToday = `${bogotaTime.getUTCFullYear()}-${String(bogotaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bogotaTime.getUTCDate()).padStart(2, '0')}`;
  
  const selectedDate = dateParam || bogotaToday;
  
  const authRole = user?.user_metadata?.role;
  let role = (authRole === "admin" || authRole === "superadmin")
    ? authRole
    : (sessionStaff?.role ?? authRole ?? "admin");

  // Si se inició sesión explícitamente como barbero usando PIN, aplicar el rol
  if (activeRole === "barber" && (role === "admin" || role === "superadmin" || sessionStaff?.role === "barber")) {
    role = "barber";
  } else if (activeRole === "admin" && (authRole === "admin" || authRole === "superadmin")) {
    role = authRole;
  }

  const isBarber = role === "barber";

  // Navigation dates logic
  const d = new Date(selectedDate + "T12:00:00");
  const prevDate = new Date(d);
  prevDate.setDate(d.getDate() - 1);
  const nextDate = new Date(d);
  nextDate.setDate(d.getDate() + 1);

  const prevStr = prevDate.toISOString().split('T')[0];
  const nextStr = nextDate.toISOString().split('T')[0];
  const todayStr = bogotaToday;

  const adminSupabase = await createAdminClient();
  
  // Fetch range: 
  // If Admin: Just the selected day (+/- small buffer)
  // If Barber: 7 days starting from selectedDate to show a weekly-like view
  const fetchStart = new Date(`${selectedDate}T00:00:00Z`);
  fetchStart.setTime(fetchStart.getTime() + (5 * 3600000));
  fetchStart.setHours(fetchStart.getHours() - 6);

  const fetchEnd = new Date(fetchStart);
  if (isBarber) {
    fetchEnd.setDate(fetchEnd.getDate() + 7);
  } else {
    fetchEnd.setHours(fetchEnd.getHours() + 36);
  }

  const [ {data: appointmentsRaw}, {data: clients}, {data: staffRaw}, {data: services}, {data: blocksRaw} ] = await withTimeout(
    Promise.all([
      adminSupabase
        .from("appointments")
        .select("*, client:clients(*), staff:tenant_staff(*, profiles(*)), service:services(*), appointment_services(services(*))")
        .eq("tenant_id", tenantId)
        .match(isBarber ? { staff_id: sessionStaff.id } : {})
        .gte("start_time", fetchStart.toISOString())
        .lte("start_time", fetchEnd.toISOString())
        .neq("status", "cancelled"),
      adminSupabase.from("clients").select("id, full_name, id_number").eq("tenant_id", tenantId).order("full_name"),
      adminSupabase
        .from("tenant_staff")
        .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, working_hours, profile:profiles(full_name, avatar_url)")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .in("role", ["barber", "owner", "admin"])
        // Admin: fetch ALL active barbers
        // Barber: fetch only themselves
        .match(isBarber ? { id: sessionStaff.id } : {}),
      adminSupabase.from("services").select("id, name, price, duration_minutes").eq("tenant_id", tenantId).eq("is_active", true).order("price", { ascending: false }),
      (adminSupabase as any)
        .from("agenda_blocks")
        .select("*")
        .eq("tenant_id", tenantId)
        .match(isBarber ? { staff_id: sessionStaff.id } : {})
        .gte("start_time", fetchStart.toISOString())
        .lte("start_time", fetchEnd.toISOString())
    ]),
    8000,
    "Fetch Dashboard Main Data (Appointments/Staff)"
  );

  const appointments = ((appointmentsRaw as any[]) || []).map(appt => ({
    ...appt,
    services: appt.appointment_services?.map((as: any) => as.services) || [],
    service: appt.appointment_services?.[0]?.services || appt.service // fallback for single-service backwards compatibility
  }));
  const agendaBlocks = (blocksRaw as any[]) || [];

  // Map staff
  const staff = staffRaw?.map((s: any) => ({
    id: s.id,
    display_name: s.profile?.full_name || s.display_name || "Sin nombre",
    avatar_url: s.profile?.avatar_url || s.avatar_url,
    commission_rate: s.commission_rate || 0,
    daily_commission_rates: s.daily_commission_rates || {},
    compensation_type: s.compensation_type,
    rent_amount: s.rent_amount || 0,
    role: s.role,
    working_hours: s.working_hours || null,
  })) || [];

  // Inject Lunch Breaks as virtual agenda blocks
  staff.forEach(s => {
    if (s.working_hours && Array.isArray(s.working_hours) && s.working_hours.length === 7) {
       const msInDay = 24 * 3600000;
       const daysToIterate = isBarber ? 7 : 1;
       const baseDate = new Date(selectedDate + "T12:00:00-05:00");
       
       for(let i = 0; i < daysToIterate; i++) {
          const currentDate = new Date(baseDate.getTime() + i * msInDay);
          const dayIndex = currentDate.getDay(); // 0=Sun
          const dayConfig = s.working_hours[dayIndex];
          if (dayConfig && dayConfig.has_break && dayConfig.break_start != null && dayConfig.break_end != null) {
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            const startH = Math.floor(dayConfig.break_start);
            const startM = Math.round((dayConfig.break_start - startH) * 60);
            const endH = Math.floor(dayConfig.break_end);
            const endM = Math.round((dayConfig.break_end - endH) * 60);
            
            agendaBlocks.push({
               id: `lunch-${s.id}-${dateStr}`,
               tenant_id: tenantId,
               staff_id: s.id,
               start_time: new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00-05:00`).toISOString(),
               end_time: new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00-05:00`).toISOString(),
               reason: "Almuerzo",
               is_lunch_break: true
            });
          }
       }
    }
  });

  const settings = sessionStaff?.tenant?.settings || {};
  const selectedDayIndex = new Date(selectedDate + "T12:00:00Z").getDay(); // 0=Sun…6=Sat
  const byDay: Array<{open: boolean; start: number; end: number}> | undefined =
    settings?.business_hours_by_day;

  let startHour: number;
  let endHour: number;
  let isShopClosed = false;

  if (byDay && byDay.length === 7) {
    const dayConfig = byDay[selectedDayIndex];
    startHour = dayConfig.open ? (!isNaN(Number(dayConfig.start)) ? Number(dayConfig.start) : 8) : 8;
    endHour = dayConfig.open ? (!isNaN(Number(dayConfig.end)) ? Number(dayConfig.end) : 20) : 20;
    isShopClosed = !dayConfig.open;
  } else {
    const s = settings?.business_hours?.start;
    const e = settings?.business_hours?.end;
    startHour = s !== undefined && !isNaN(Number(s)) ? Number(s) : 8;
    endHour = e !== undefined && !isNaN(Number(e)) ? Number(e) : 20;
  }

  // Fallback si por alguna razón siguen siendo NaN o si start >= end
  if (isNaN(startHour)) startHour = 8;
  if (isNaN(endHour)) endHour = 20;
  if (startHour >= endHour) endHour = startHour + 12;

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      className="antigravity-bg flex flex-col gap-3 overflow-hidden -m-6 lg:-m-8 p-3 md:p-5 h-[calc(100%+48px)] lg:h-[calc(100%+64px)]"
    >

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8 relative z-50 shrink-0">
        <div className="animate-float flex items-center justify-between lg:block">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white capitalize">
              {isBarber ? "Mi Agenda" : (selectedDate === bogotaToday ? "Hoy" : "Agenda")}
            </h1>
            <p className="text-zinc-500 text-[10px] md:text-sm font-medium uppercase tracking-widest mt-0.5">
              {isBarber ? `Semana del ${displayDate}` : displayDate}
            </p>
          </div>
        </div>

        <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 animate-float-slow flex items-center gap-2">
          <div className="glass-card p-1.5 rounded-2xl flex items-center gap-1 border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-[0_0_50px_-12px_hsla(var(--primary-glow))]">
            <Link 
              href={`/dashboard/appointments?date=${prevStr}`}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <Link 
              href={`/dashboard/appointments?date=${todayStr}`}
              className="px-5 py-2.5 hover:bg-white/10 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white active:scale-95 border border-white/5"
            >
              Hoy
            </Link>

            <Link 
              href={`/dashboard/appointments?date=${nextStr}`}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="animate-float-delayed">
          <NewAppointmentDialog 
            clients={clients || []} 
            staff={staff || []} 
            services={services || []} 
            appointments={appointments}
            startHour={startHour}
            endHour={endHour}
            theme={settings?.theme || "dark"}
            tenantId={tenantId}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <CalendarView 
          appointments={appointments} 
          agendaBlocks={agendaBlocks}
          staff={staff} 
          startHour={startHour} 
          endHour={endHour}
          clients={clients || []}
          services={services || []}
          selectedDate={selectedDate}
          viewMode={isBarber ? "days" : "staff"}
          theme={settings?.theme || "dark"}
          tenantId={tenantId}
          appointmentInterval={Number(settings?.appointment_interval) || 15}
        />
      </div>
    </div>
  );
}
