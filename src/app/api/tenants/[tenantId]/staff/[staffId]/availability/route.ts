import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateAvailableSlots, groupSlotsByPeriod } from "@/lib/scheduling";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; staffId: string }> }
) {
  try {
    const { tenantId, staffId } = await params;
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const serviceIdsParam = searchParams.get("service_ids");
    const durationParam = searchParams.get("duration");
    const bufferTimeParam = searchParams.get("buffer_time");

    if (!date) {
      return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Ventana del día en la zona horaria de Bogotá → UTC
    const startOfDayUTC = new Date(`${date}T00:00:00-05:00`).toISOString();
    const endOfDayUTC   = new Date(`${date}T23:59:59-05:00`).toISOString();

    // -------------------------------------------------------------------------
    // Consulta paralela optimizada a Supabase.
    //
    // SELECT reducido en appointments: ya NO se hace JOIN a services porque
    // end_time siempre está presente en los registros modernos de BarberOS.
    // Esto elimina un sub-query costoso por cada fila devuelta.
    // -------------------------------------------------------------------------
    const [
      { data: tenant },
      { data: staffRow },
      { data: appointments },
      { data: blocks },
      { data: servicesData },
      { data: tenantServices },
    ] = await Promise.all([
      // 1. Horario de apertura del local (tenant settings)
      (supabase as any)
        .from("tenants")
        .select("settings")
        .eq("id", tenantId)
        .single(),

      // 2. Horario laboral propio del barbero (puede ser más restringido)
      (supabase as any)
        .from("tenant_staff")
        .select("working_hours")
        .eq("id", staffId)
        .eq("tenant_id", tenantId)
        .single(),

      // 3. Citas ya agendadas del barbero en ese día
      //    Solo pedimos start_time y end_time — sin join a services
      (supabase as any)
        .from("appointments")
        .select("start_time, end_time")
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfDayUTC)
        .lte("start_time", endOfDayUTC)
        .in("status", ["pending", "confirmed", "in_progress"]),

      // 4. Bloques de agenda bloqueados (vacaciones, reuniones, etc.)
      (supabase as any)
        .from("agenda_blocks")
        .select("start_time, end_time")
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfDayUTC)
        .lte("start_time", endOfDayUTC),

      // 5. Servicios solicitados — solo si se pasan service_ids
      serviceIdsParam
        ? (supabase as any)
            .from("services")
            .select("id, duration_minutes")
            .in("id", serviceIdsParam.split(","))
        : Promise.resolve({ data: [] }),

      // 6. Todos los servicios del tenant para determinar duración mínima
      //    (se usa solo en modo legacy si no se pasan service_ids)
      (supabase as any)
        .from("services")
        .select("duration_minutes")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
    ]);

    // -------------------------------------------------------------------------
    // Calcular horario efectivo del barbero para el día solicitado
    // -------------------------------------------------------------------------
    const settings = tenant?.settings ?? {};
    const requestedDayIndex = new Date(`${date}T12:00:00Z`).getDay(); // 0=Dom … 6=Sáb

    const byDay: Array<{ open: boolean; start: number; end: number }> | undefined =
      settings?.business_hours_by_day;

    // Apertura/cierre del local
    let shopStart: number;
    let shopEnd: number;

    if (byDay && byDay.length === 7) {
      const dayConfig = byDay[requestedDayIndex];
      if (!dayConfig.open) {
        return NextResponse.json({ continuous: [], slots: [], fragmented: [], groups: [] });
      }
      shopStart = dayConfig.start;
      shopEnd   = dayConfig.end;
    } else {
      shopStart = settings?.business_hours?.start ?? 8;
      shopEnd   = settings?.business_hours?.end ?? 20;
    }

    // Apertura/cierre del barbero (siempre dentro del rango del local)
    const barberByDay: Array<{
      open: boolean;
      start: number;
      end: number;
      has_break?: boolean;
      break_start?: number;
      break_end?: number;
    }> | null = staffRow?.working_hours;

    let startHour = shopStart;
    let endHour   = shopEnd;
    let breakStart: number | null = null;
    let breakEnd: number | null   = null;

    if (barberByDay && Array.isArray(barberByDay) && barberByDay.length === 7) {
      const barberDay = barberByDay[requestedDayIndex];
      if (!barberDay.open) {
        return NextResponse.json({ continuous: [], slots: [], fragmented: [], groups: [] });
      }
      startHour = Math.max(shopStart, barberDay.start);
      endHour   = Math.min(shopEnd,   barberDay.end);
      if (startHour >= endHour) {
        return NextResponse.json({ continuous: [], slots: [], fragmented: [], groups: [] });
      }
      if (barberDay.has_break && barberDay.break_start != null && barberDay.break_end != null) {
        breakStart = barberDay.break_start;
        breakEnd   = barberDay.break_end;
      }
    }

    // -------------------------------------------------------------------------
    // Calcular duración total de los servicios solicitados
    // -------------------------------------------------------------------------
    let serviceDuration: number;

    if (serviceIdsParam && servicesData && servicesData.length > 0) {
      const serviceMap = new Map<string, number>(
        (servicesData as Array<{ id: string; duration_minutes: number }>).map(
          (s) => [s.id, s.duration_minutes ?? 30]
        )
      );
      // Respetar duplicados en el array de IDs (mismo servicio pedido 2 veces)
      serviceDuration = serviceIdsParam
        .split(",")
        .reduce((acc, id) => acc + (serviceMap.get(id) ?? 30), 0);
    } else if (durationParam) {
      serviceDuration = parseInt(durationParam, 10);
    } else {
      // Fallback: duración mínima de la oferta del tenant
      serviceDuration =
        tenantServices && tenantServices.length > 0
          ? Math.min(
              ...(tenantServices as Array<{ duration_minutes: number }>).map(
                (s) => s.duration_minutes ?? 30
              )
            )
          : 30;
    }
    serviceDuration = Math.max(serviceDuration, 1);

    // -------------------------------------------------------------------------
    // Construir horas de apertura/cierre como "HH:MM"
    // -------------------------------------------------------------------------
    const decToTime = (dec: number): string => {
      const h = Math.floor(dec);
      const m = Math.round((dec - h) * 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    // -------------------------------------------------------------------------
    // Consolidar todas las citas y bloqueos ocupados
    // -------------------------------------------------------------------------
    const allOccupied = [
      ...(appointments ?? []).map((a: any) => ({
        start_time: a.start_time as string,
        end_time:   a.end_time   as string,
      })),
      ...(blocks ?? []).map((b: any) => ({
        start_time: b.start_time as string,
        end_time:   b.end_time   as string,
      })),
    ];

    // Añadir el bloque de almuerzo/break del barbero como si fuera una cita
    if (breakStart !== null && breakEnd !== null) {
      allOccupied.push({
        start_time: `${date}T${decToTime(breakStart)}:00-05:00`,
        end_time:   `${date}T${decToTime(breakEnd)}:00-05:00`,
      });
    }

    // Buffer de limpieza opcional (pasado como query param ?buffer_time=5)
    const bufferTime = bufferTimeParam ? Math.max(0, parseInt(bufferTimeParam, 10)) : 0;

    // -------------------------------------------------------------------------
    // Ejecutar el algoritmo de disponibilidad
    // -------------------------------------------------------------------------
    const allSlots = generateAvailableSlots({
      openTime:              decToTime(startHour),
      closeTime:             decToTime(endHour),
      serviceDuration,
      existingAppointments:  allOccupied,
      bufferTime,
      timezone:              "America/Bogota",
    });

    // -------------------------------------------------------------------------
    // Filtrar slots ya pasados si la fecha solicitada es hoy (Bogotá)
    // -------------------------------------------------------------------------
    const now = new Date();
    const bogotaFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const bogotaParts = bogotaFormatter.formatToParts(now);
    const todayBogota = [
      bogotaParts.find((p) => p.type === "year")!.value,
      bogotaParts.find((p) => p.type === "month")!.value,
      bogotaParts.find((p) => p.type === "day")!.value,
    ].join("-");
    const nowMinutes =
      parseInt(bogotaParts.find((p) => p.type === "hour")!.value, 10) * 60 +
      parseInt(bogotaParts.find((p) => p.type === "minute")!.value, 10);

    const isToday = date === todayBogota;
    const filteredSlots = isToday
      ? allSlots.filter((s) => s.minutesSinceMidnight > nowMinutes)
      : allSlots;

    // -------------------------------------------------------------------------
    // Agrupar por período del día (para la UI mejorada)
    // -------------------------------------------------------------------------
    const groups = groupSlotsByPeriod(filteredSlots);

    // Slot times as plain strings for backward-compatibility
    const slotTimes = filteredSlots.map((s) => s.time);

    // -------------------------------------------------------------------------
    // Opciones fragmentadas (multi-servicio, cuando no hay bloque continuo)
    // -------------------------------------------------------------------------
    const requestedServiceIds = serviceIdsParam?.split(",") ?? [];
    let fragmentedOptions: any[] = [];

    if (
      filteredSlots.length === 0 &&
      requestedServiceIds.length > 1 &&
      servicesData &&
      servicesData.length > 0
    ) {
      const serviceMap = new Map<string, { id: string; duration_minutes: number }>(
        (servicesData as Array<{ id: string; duration_minutes: number }>).map((s) => [
          s.id,
          s,
        ])
      );

      // Lista de servicios en el orden solicitado (respetando duplicados)
      const orderedServices = requestedServiceIds
        .map((id) => serviceMap.get(id))
        .filter(Boolean) as Array<{ id: string; duration_minutes: number }>;

      // Minutos bloqueados para validar rápidamente si un slot cabe
      const blockedSet = new Set<number>();
      for (const occ of allOccupied) {
        const s = toMinutes_local(occ.start_time);
        const e = toMinutes_local(occ.end_time) + bufferTime;
        for (let t = s; t < e; t++) blockedSet.add(t);
      }

      const endMin = endHour * 60;
      const step = 5; // Paso fino para búsqueda de fragmentados

      const fits = (startMin: number, dur: number): boolean => {
        if (startMin + dur > endMin) return false;
        for (let t = startMin; t < startMin + dur; t++) {
          if (blockedSet.has(t)) return false;
        }
        return true;
      };

      const findCombinations = (
        svcIndex: number,
        fromMin: number,
        combo: Array<{ id: string; startMin: number; duration: number }>
      ) => {
        if (fragmentedOptions.length >= 8) return; // Limitar combinaciones
        if (svcIndex === orderedServices.length) {
          let waitTime = 0;
          for (let i = 1; i < combo.length; i++) {
            const prev = combo[i - 1];
            const curr = combo[i];
            waitTime += curr.startMin - (prev.startMin + prev.duration);
          }
          fragmentedOptions.push({
            label: combo
              .map(
                (c) =>
                  `${String(Math.floor(c.startMin / 60)).padStart(2, "0")}:${String(c.startMin % 60).padStart(2, "0")}`
              )
              .join(" → "),
            waitTime,
            slots: combo.map((c) => ({
              serviceId: c.id,
              startTime: `${String(Math.floor(c.startMin / 60)).padStart(2, "0")}:${String(c.startMin % 60).padStart(2, "0")}`,
              duration: c.duration,
            })),
          });
          return;
        }

        const svc = orderedServices[svcIndex];
        for (let min = fromMin; min <= endMin - svc.duration_minutes; min += step) {
          if (isToday && min <= nowMinutes) continue;
          if (fits(min, svc.duration_minutes)) {
            combo.push({ id: svc.id, startMin: min, duration: svc.duration_minutes });
            findCombinations(svcIndex + 1, min + svc.duration_minutes, combo);
            combo.pop();
          }
        }
      };

      findCombinations(0, startHour * 60, []);
      fragmentedOptions.sort((a, b) =>
        a.waitTime !== b.waitTime
          ? a.waitTime - b.waitTime
          : parseInt(a.slots[0].startTime) - parseInt(b.slots[0].startTime)
      );
    }

    return NextResponse.json({
      // Backward-compatible keys
      slots:      slotTimes,
      continuous: slotTimes,
      fragmented: fragmentedOptions.slice(0, 8),
      // Enhanced response: full slot objects + groups
      slotDetails: filteredSlots,
      groups,
      meta: {
        serviceDuration,
        bufferTime,
        date,
        openTime:  decToTime(startHour),
        closeTime: decToTime(endHour),
      },
    });
  } catch (err: any) {
    console.error("[availability] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

// Helper local para el cálculo de fragmentados (evita importar el módulo de scheduling
// solo para este propósito interno de performance)
function toMinutes_local(timeStr: string): number {
  if (timeStr.includes("T") || timeStr.includes("Z") || timeStr.includes("+")) {
    const date = new Date(timeStr);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    return (
      parseInt(parts.find((p) => p.type === "hour")!.value, 10) * 60 +
      parseInt(parts.find((p) => p.type === "minute")!.value, 10)
    );
  }
  const [h, m] = timeStr.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}
