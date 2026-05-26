import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; staffId: string }> }
) {
  try {
    const { tenantId, staffId } = await params;
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // 1. Get tenant business hours
    const { data: tenant } = await (supabase as any)
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const settings = tenant?.settings || {};

    // Determine the day-of-week for the requested date (0=Sun … 6=Sat)
    const requestedDayIndex = new Date(`${date}T12:00:00Z`).getDay();
    const byDay: Array<{open: boolean; start: number; end: number}> | undefined =
      settings?.business_hours_by_day;

    let shopStart: number;
    let shopEnd: number;

    if (byDay && byDay.length === 7) {
      const dayConfig = byDay[requestedDayIndex];
      // If the shop is closed that day, return empty slots immediately
      if (!dayConfig.open) {
        return NextResponse.json({ slots: [] });
      }
      shopStart = dayConfig.start;
      shopEnd = dayConfig.end;
    } else {
      // Fallback to global hours
      shopStart = settings?.business_hours?.start ?? 8;
      shopEnd = settings?.business_hours?.end ?? 20;
    }

    // 1b. Get barber's own working hours for this day
    const { data: staffRow } = await (supabase as any)
      .from("tenant_staff")
      .select("working_hours")
      .eq("id", staffId)
      .eq("tenant_id", tenantId)
      .single();

    const barberByDay: Array<{open: boolean; start: number; end: number}> | null = staffRow?.working_hours;
    let startHour = shopStart;
    let endHour = shopEnd;

    if (barberByDay && Array.isArray(barberByDay) && barberByDay.length === 7) {
      const barberDay = barberByDay[requestedDayIndex];
      // If the barber is off that day, return empty
      if (!barberDay.open) {
        return NextResponse.json({ slots: [] });
      }
      // Effective window is the intersection of shop and barber hours
      startHour = Math.max(shopStart, barberDay.start);
      endHour = Math.min(shopEnd, barberDay.end);
      if (startHour >= endHour) {
        return NextResponse.json({ slots: [] });
      }
    }

    // 2. Get existing appointments for that staff and date
    // Shift to Bogota time (UTC-5)
    const startOfDay = new Date(`${date}T00:00:00Z`);
    startOfDay.setTime(startOfDay.getTime() + (5 * 3600000));
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(endOfDay.getHours() + 24);

    const { data: appointments } = await (supabase as any)
      .from("appointments")
      .select("start_time, end_time, services(duration_minutes)")
      .eq("staff_id", staffId)
      .eq("tenant_id", tenantId)
      .gte("start_time", startOfDay.toISOString())
      .lt("start_time", endOfDay.toISOString())
      .neq("status", "cancelled")
      .neq("status", "deleted");

    // Fetch agenda blocks
    const { data: blocks } = await (supabase as any)
      .from("agenda_blocks")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("tenant_id", tenantId)
      .gte("start_time", startOfDay.toISOString())
      .lt("start_time", endOfDay.toISOString());

    // 3. Generate slots
    const slots = [];
    const now = new Date();

    // Get current Bogotá time components using Intl
    const bogotaFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
    const bogotaParts = bogotaFormatter.formatToParts(now);
    const todayBogota = `${bogotaParts.find(p => p.type === "year")!.value}-${bogotaParts.find(p => p.type === "month")!.value}-${bogotaParts.find(p => p.type === "day")!.value}`;
    const nowHour = parseInt(bogotaParts.find(p => p.type === "hour")!.value, 10);
    const nowMin  = parseInt(bogotaParts.find(p => p.type === "minute")!.value, 10);
    const isToday = date === todayBogota;

    for (let hour = startHour; hour < endHour; hour++) {
      for (const min of [0, 30]) {
        // Skip past slots when the selected date is today
        if (isToday && (hour < nowHour || (hour === nowHour && min <= nowMin))) {
          continue;
        }

        const slotTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // Build a proper UTC timestamp for this Bogotá-local slot
        const slotUTC = new Date(`${date}T${slotTime}:00-05:00`);

        // Check if slot is taken by appointment
        const isTaken = appointments?.some((appt: any) => {
          const apptStart = new Date(appt.start_time);
          const apptEnd = new Date(appt.end_time || apptStart.getTime() + (appt.services?.duration_minutes || 30) * 60000);
          return slotUTC >= apptStart && slotUTC < apptEnd;
        });

        // Check if slot is taken by agenda block
        const isBlocked = blocks?.some((b: any) => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return slotUTC >= bStart && slotUTC < bEnd;
        });

        if (!isTaken && !isBlocked) {
          slots.push(slotTime);
        }
      }
    }

    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error("Availability API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
