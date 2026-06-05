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
    const durationStr = searchParams.get("duration");
    const parsedDuration = durationStr ? parseInt(durationStr, 10) : 15;
    const requestedDuration = Math.max(parsedDuration, 15); // minimum 15 mins to prevent 0-duration bypassing conflict checks

    if (!date) {
      return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const startOfDayUTC = new Date(`${date}T00:00:00-05:00`).toISOString();
    const endOfDayUTC   = new Date(`${date}T23:59:59-05:00`).toISOString();

    const [
      { data: tenant },
      { data: staffRow },
      { data: appointments },
      { data: blocks }
    ] = await Promise.all([
      // 1. Get tenant business hours
      (supabase as any).from("tenants").select("settings").eq("id", tenantId).single(),
      
      // 1b. Get barber's own working hours for this day
      (supabase as any).from("tenant_staff").select("working_hours").eq("id", staffId).eq("tenant_id", tenantId).single(),
      
      // 2. Get existing appointments for that staff on that day
      (supabase as any).from("appointments").select("start_time, end_time, service:services(duration_minutes)").eq("staff_id", staffId).eq("tenant_id", tenantId).gte("start_time", startOfDayUTC).lte("start_time", endOfDayUTC).in("status", ["pending", "confirmed", "completed"]),
      
      // 3. Fetch agenda blocks for the same day
      (supabase as any).from("agenda_blocks").select("start_time, end_time").eq("staff_id", staffId).eq("tenant_id", tenantId).gte("start_time", startOfDayUTC).lte("start_time", endOfDayUTC)
    ]);

    const settings = tenant?.settings || {};

    // Determine the day-of-week for the requested date (0=Sun … 6=Sat)
    const requestedDayIndex = new Date(`${date}T12:00:00Z`).getDay();
    const byDay: Array<{ open: boolean; start: number; end: number }> | undefined =
      settings?.business_hours_by_day;

    let shopStart: number;
    let shopEnd: number;

    if (byDay && byDay.length === 7) {
      const dayConfig = byDay[requestedDayIndex];
      if (!dayConfig.open) {
        return NextResponse.json({ slots: [] });
      }
      shopStart = dayConfig.start;
      shopEnd = dayConfig.end;
    } else {
      shopStart = settings?.business_hours?.start ?? 8;
      shopEnd = settings?.business_hours?.end ?? 20;
    }

    const barberByDay: Array<{
      open: boolean; start: number; end: number;
      has_break?: boolean; break_start?: number; break_end?: number;
    }> | null = staffRow?.working_hours;

    let startHour = shopStart;
    let endHour = shopEnd;
    let breakStart: number | null = null;
    let breakEnd: number | null = null;

    if (barberByDay && Array.isArray(barberByDay) && barberByDay.length === 7) {
      const barberDay = barberByDay[requestedDayIndex];
      if (!barberDay.open) {
        return NextResponse.json({ slots: [] });
      }
      startHour = Math.max(shopStart, barberDay.start);
      endHour = Math.min(shopEnd, barberDay.end);
      if (startHour >= endHour) {
        return NextResponse.json({ slots: [] });
      }
      if (barberDay.has_break && barberDay.break_start != null && barberDay.break_end != null) {
        breakStart = barberDay.break_start;
        breakEnd = barberDay.break_end;
      }
    }

    // 4. Build a Set of blocked minutes (total minutes since midnight Bogotá)
    const blockedMinutes = new Set<number>();

    const bogotaMinutesFromISO = (iso: string): number => {
      const d = new Date(iso);
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(d);
      const h = parseInt(parts.find(p => p.type === "hour")!.value, 10);
      const m = parseInt(parts.find(p => p.type === "minute")!.value, 10);
      return h * 60 + m;
    };

    for (const appt of appointments ?? []) {
      const startMin = bogotaMinutesFromISO(appt.start_time);
      // Use end_time if available, otherwise fallback to service duration
      let endMin: number;
      if (appt.end_time) {
        endMin = bogotaMinutesFromISO(appt.end_time);
      } else {
        endMin = startMin + (appt.service?.duration_minutes || 30);
      }
      for (let t = startMin; t < endMin; t++) {
        blockedMinutes.add(t);
      }
    }

    for (const block of blocks ?? []) {
      const startMin = bogotaMinutesFromISO(block.start_time);
      const endMin   = bogotaMinutesFromISO(block.end_time);
      for (let t = startMin; t < endMin; t++) {
        blockedMinutes.add(t);
      }
    }

    // 5. Generate available slots
    const slots: string[] = [];

    // Get current Bogotá time to filter out past slots for today
    const now = new Date();
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
      for (const min of [0, 15, 30, 45]) {
        // Skip slots in the past when booking for today
        if (isToday && (hour < nowHour || (hour === nowHour && min <= nowMin))) {
          continue;
        }

        // Skip lunch break
        if (breakStart !== null && breakEnd !== null && hour >= breakStart && hour < breakEnd) {
          continue;
        }

        const slotTotalMin = hour * 60 + min;

        // Check if the entire required duration fits without hitting a block
        let canFit = true;
        // 1. Check if it exceeds barber's shift end
        if (slotTotalMin + requestedDuration > endHour * 60) {
          canFit = false;
        }
        // 2. Check if it hits the lunch break
        if (canFit && breakStart !== null && breakEnd !== null) {
          const breakStartMin = breakStart * 60;
          const breakEndMin = breakEnd * 60;
          // If the slot starts before break but ends during/after break
          if (slotTotalMin < breakStartMin && (slotTotalMin + requestedDuration) > breakStartMin) {
            canFit = false;
          }
        }
        // 3. Check against blocked minutes from appointments/blocks
        if (canFit) {
          for (let t = slotTotalMin; t < slotTotalMin + requestedDuration; t++) {
            if (blockedMinutes.has(t)) {
              canFit = false;
              break;
            }
          }
        }

        if (canFit) {
          slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
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
