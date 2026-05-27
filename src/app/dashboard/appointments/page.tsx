import Link from "next/link";
import { Clock, LayoutList, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { NewAppointmentDialog } from "@/components/appointments/NewAppointmentDialog";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/appointments/CalendarView";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { tenantId, staff: sessionStaff, user, activeRole } = await getSession();
  if (!tenantId) return <div>No se encontró la barbería. Por favor, inicia sesión.</div>;

  const { date: dateParam } = await searchParams;
  
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

  const [ {data: appointmentsRaw}, {data: clients}, {data: staffRaw}, {data: services}, {data: tenant}, {data: blocksRaw} ] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("*, client:clients(*), service:services(*), staff:tenant_staff(*, profiles(*))")
      .eq("tenant_id", tenantId)
      .match(isBarber ? { staff_id: sessionStaff.id } : {})
      .gte("start_time", fetchStart.toISOString())
      .lte("start_time", fetchEnd.toISOString())
      .neq("status", "cancelled"),
    adminSupabase.from("clients").select("id, full_name, id_number").eq("tenant_id", tenantId).order("full_name"),
    adminSupabase
      .from("tenant_staff")
      .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, working_hours, profiles(full_name, avatar_url)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      // Admin: fetch ALL active staff (barbers + admins who cut hair)
      // Barber: fetch only themselves
      .match(isBarber ? { id: sessionStaff.id } : {}),
    adminSupabase.from("services").select("id, name, price").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    (adminSupabase as any).from("tenants").select("settings").eq("id", tenantId).single(),
    (adminSupabase as any)
      .from("agenda_blocks")
      .select("*")
      .eq("tenant_id", tenantId)
      .match(isBarber ? { staff_id: sessionStaff.id } : {})
      .gte("start_time", fetchStart.toISOString())
      .lte("start_time", fetchEnd.toISOString())
  ]);

  const appointments = (appointmentsRaw as any[]) || [];
  const agendaBlocks = (blocksRaw as any[]) || [];

  // Map staff
  const staff = staffRaw?.map((s: any) => ({
    id: s.id,
    display_name: s.profiles?.full_name || "Sin nombre",
    avatar_url: s.profiles?.avatar_url,
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
            
            agendaBlocks.push({
               id: `lunch-${s.id}-${dateStr}`,
               tenant_id: tenantId,
               staff_id: s.id,
               start_time: new Date(`${dateStr}T${String(dayConfig.break_start).padStart(2, '0')}:00:00-05:00`).toISOString(),
               end_time: new Date(`${dateStr}T${String(dayConfig.break_end).padStart(2, '0')}:00:00-05:00`).toISOString(),
               reason: "Almuerzo",
               is_lunch_break: true
            });
          }
       }
    }
  });

  const settings = (tenant as any)?.settings || {};
  const selectedDayIndex = new Date(selectedDate + "T12:00:00Z").getDay(); // 0=Sun…6=Sat
  const byDay: Array<{open: boolean; start: number; end: number}> | undefined =
    settings?.business_hours_by_day;

  let startHour: number;
  let endHour: number;
  let isShopClosed = false;

  if (byDay && byDay.length === 7) {
    const dayConfig = byDay[selectedDayIndex];
    startHour = dayConfig.open ? dayConfig.start : 8;
    endHour = dayConfig.open ? dayConfig.end : 20;
    isShopClosed = !dayConfig.open;
  } else {
    startHour = settings?.business_hours?.start || 8;
    endHour = settings?.business_hours?.end || 20;
  }

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="antigravity-bg -m-4 p-4 md:-m-8 md:p-8 h-[calc(100vh-64px)] overflow-hidden space-y-4 md:space-y-12 pb-4 md:pb-12 flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8 relative z-50">
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
          />
        </div>
      </div>

      <div className="animate-float-slow flex-1 min-h-0 flex flex-col">
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
        />
      </div>
    </div>
  );
}
