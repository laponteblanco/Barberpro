/**
 * scheduling.ts
 *
 * Módulo de generación inteligente de franjas de disponibilidad para BarberOS.
 *
 * Algoritmo "Llenado Contiguo con Bloques Dinámicos":
 *  1. Calcula los bloques de tiempo LIBRES del día restando las citas existentes
 *     (y el tiempo de buffer opcional) del horario laboral.
 *  2. Dentro de cada bloque libre, itera con un paso igual a la duración EXACTA
 *     del servicio — nunca usa un paso fijo de 15 min.
 *  3. Prioriza la mañana hacia la tarde (iteración ascendente natural).
 *
 * Ejemplos clave:
 *  - Servicio 60 min, día vacío 8:00-18:00 → 8:00, 9:00, 10:00 … 17:00
 *  - Servicio 25 min, día vacío 8:00-9:00  → 8:00, 8:25, 8:50
 *  - Cita 8:00-8:45 → próximo slot para svc de 45 min es exactamente 8:45
 */

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface ScheduleInput {
  /** Hora de apertura, formato "HH:MM" (ej. "08:00") */
  openTime: string;
  /** Hora de cierre, formato "HH:MM" (ej. "18:00") */
  closeTime: string;
  /** Duración total del/los servicio(s) en minutos */
  serviceDuration: number;
  /** Citas ya agendadas para ese barbero en ese día */
  existingAppointments: AppointmentInterval[];
  /**
   * Minutos de limpieza/buffer que se suman al final de cada cita.
   * Útil para que el barbero tenga tiempo de preparar la estación.
   * Default: 0
   */
  bufferTime?: number;
  /**
   * Zona horaria del tenant (IANA).
   * Default: "America/Bogota"
   */
  timezone?: string;
}

export interface AppointmentInterval {
  /** ISO timestamp o "HH:MM" */
  start_time: string;
  /** ISO timestamp o "HH:MM" */
  end_time: string;
}

export interface SlotInfo {
  /** Formato 24h "HH:MM" — clave canónica para enviar al backend */
  time: string;
  /** Formato 12h con AM/PM — listo para renderizar (ej. "8:25 am") */
  displayTime: string;
  /** Minutos desde la medianoche — útil para ordenar y comparar */
  minutesSinceMidnight: number;
}

/** Intervalo interno de tiempo en minutos desde la medianoche */
interface MinuteInterval {
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Convierte "HH:MM" o un ISO timestamp a minutos desde la medianoche.
 * Para ISO timestamps aplica la zona horaria indicada.
 */
function toMinutes(timeStr: string, timezone = "America/Bogota"): number {
  if (timeStr.includes("T") || timeStr.includes("Z") || timeStr.includes("+")) {
    // ISO timestamp — extraer la hora local según el timezone del tenant
    const date = new Date(timeStr);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    return h * 60 + m;
  }

  // Formato "HH:MM"
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) {
    throw new Error(`[scheduling] Formato de hora no válido: "${timeStr}"`);
  }
  return h * 60 + m;
}

/** Convierte minutos desde medianoche a "HH:MM" */
function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convierte "HH:MM" a formato 12h con am/pm (ej. "8:05 am", "12:00 pm") */
function toDisplayTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "pm" : "am";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${mStr} ${ampm}`;
}

/**
 * Une intervalos que se solapan o son adyacentes.
 * Entrada no necesita estar ordenada.
 */
function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: MinuteInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const last = merged[merged.length - 1];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Calcula los bloques de tiempo LIBRES del día restando los ocupados
 * del intervalo [dayStart, dayEnd].
 */
function getFreeBlocks(
  dayStart: number,
  dayEnd: number,
  occupied: MinuteInterval[]
): MinuteInterval[] {
  if (dayStart >= dayEnd) return [];

  const merged = mergeIntervals(occupied);
  const free: MinuteInterval[] = [];
  let cursor = dayStart;

  for (const occ of merged) {
    // Recortar al rango del día
    const occStart = Math.max(occ.start, dayStart);
    const occEnd = Math.min(occ.end, dayEnd);

    if (occStart >= dayEnd) break;
    if (occEnd <= dayStart) continue;

    if (occStart > cursor) {
      free.push({ start: cursor, end: occStart });
    }
    cursor = Math.max(cursor, occEnd);
  }

  if (cursor < dayEnd) {
    free.push({ start: cursor, end: dayEnd });
  }

  return free;
}

// ---------------------------------------------------------------------------
// Función principal exportada
// ---------------------------------------------------------------------------

/**
 * Genera las franjas horarias disponibles para un barbero en un día dado,
 * respetando las reglas de negocio de BarberOS:
 *
 * - Bloques Dinámicos Estrictos: el step de iteración = serviceDuration exacto.
 * - Llenado Contiguo (mañana → tarde): siempre se parte desde el inicio de
 *   cada bloque libre, evitando huecos imposibles de llenar.
 * - Buffer opcional: se puede sumar tiempo de limpieza entre citas.
 *
 * @returns Array de SlotInfo ordenado cronológicamente.
 */
export function generateAvailableSlots(input: ScheduleInput): SlotInfo[] {
  const {
    openTime,
    closeTime,
    serviceDuration,
    existingAppointments,
    bufferTime = 0,
    timezone = "America/Bogota",
  } = input;

  // Guardia: duración debe ser positiva
  const duration = Math.max(serviceDuration, 1);

  const dayStart = toMinutes(openTime, timezone);
  const dayEnd = toMinutes(closeTime, timezone);

  if (dayStart >= dayEnd || dayEnd - dayStart < duration) {
    return [];
  }

  // Construir lista de intervalos ocupados (en minutos desde medianoche)
  const occupiedIntervals: MinuteInterval[] = existingAppointments
    .map((appt) => {
      const start = toMinutes(appt.start_time, timezone);
      const end = toMinutes(appt.end_time, timezone) + bufferTime;
      return { start, end };
    })
    .filter((interval) => interval.end > interval.start); // ignorar inválidos

  // Calcular bloques libres
  const freeBlocks = getFreeBlocks(dayStart, dayEnd, occupiedIntervals);

  // Generar slots usando el paso dinámico = serviceDuration
  const slots: SlotInfo[] = [];

  for (const block of freeBlocks) {
    const blockLength = block.end - block.start;

    // Bloque demasiado corto para el servicio
    if (blockLength < duration) continue;

    // Iterar desde block.start con paso exacto = serviceDuration
    for (let pos = block.start; pos + duration <= block.end; pos += duration) {
      const time = toTimeString(pos);
      slots.push({
        time,
        displayTime: toDisplayTime(time),
        minutesSinceMidnight: pos,
      });
    }
  }

  // Por construcción ya están ordenados, pero se garantiza aquí
  slots.sort((a, b) => a.minutesSinceMidnight - b.minutesSinceMidnight);

  return slots;
}

// ---------------------------------------------------------------------------
// Helper de agrupación para la UI
// ---------------------------------------------------------------------------

export type DayPeriod = "morning" | "afternoon" | "evening";

export interface SlotGroup {
  period: DayPeriod;
  label: string;
  slots: SlotInfo[];
}

/**
 * Agrupa un array de SlotInfo por período del día:
 *  - Mañana:  00:00 – 11:59
 *  - Tarde:   12:00 – 17:59
 *  - Noche:   18:00 – 23:59
 */
export function groupSlotsByPeriod(slots: SlotInfo[]): SlotGroup[] {
  const groups: Record<DayPeriod, SlotInfo[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const slot of slots) {
    const h = Math.floor(slot.minutesSinceMidnight / 60);
    if (h < 12) {
      groups.morning.push(slot);
    } else if (h < 18) {
      groups.afternoon.push(slot);
    } else {
      groups.evening.push(slot);
    }
  }

  const labels: Record<DayPeriod, string> = {
    morning: "Mañana",
    afternoon: "Tarde",
    evening: "Noche",
  };

  return (["morning", "afternoon", "evening"] as DayPeriod[])
    .filter((p) => groups[p].length > 0)
    .map((p) => ({ period: p, label: labels[p], slots: groups[p] }));
}

// ---------------------------------------------------------------------------
// Re-exportar helpers de bajo nivel para compatibilidad interna
// ---------------------------------------------------------------------------
export { toMinutes, toTimeString, toDisplayTime, mergeIntervals, getFreeBlocks };
