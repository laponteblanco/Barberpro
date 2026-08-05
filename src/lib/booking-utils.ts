/**
 * booking-utils.ts
 *
 * Utilidades para el cálculo de bloques de tiempo y optimización de citas para barberías.
 * Implementa la regla crítica "Snap-to-Adjacent" para evitar huecos huérfanos de exactamente 15 minutos.
 */

export interface BusinessHours {
  start: string;         // Hora de apertura (ej. "08:00")
  end: string;           // Hora de cierre (ej. "18:00")
  lunch_start?: string;  // Inicio del almuerzo (ej. "13:00")
  lunch_end?: string;    // Fin del almuerzo (ej. "14:00")
}

export interface Appointment {
  start_time: string;    // Puede ser ISO string o formato "HH:MM"
  end_time: string;      // Puede ser ISO string o formato "HH:MM"
}

export interface TimeInterval {
  start: number;         // En minutos desde la medianoche
  end: number;           // En minutos desde la medianoche
}

export interface SlotResult {
  time: string;          // Formato "HH:MM"
  isPerfectFit: boolean; // Flag para indicar que es un ajuste exacto
}

/**
 * Convierte un formato de hora "HH:MM" o un ISO timestamp a minutos transcurridos desde la medianoche.
 * Maneja adecuadamente el huso horario local si es una cadena ISO.
 */
export function timeToMinutes(timeStr: string): number {
  if (timeStr.includes("T")) {
    const date = new Date(timeStr);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const h = parseInt(parts.find(p => p.type === "hour")!.value, 10);
    const m = parseInt(parts.find(p => p.type === "minute")!.value, 10);
    return h * 60 + m;
  }
  
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  
  throw new Error(`Formato de hora no válido: ${timeStr}`);
}

/**
 * Convierte minutos desde la medianoche de regreso a un string en formato de 24 horas "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Une intervalos de tiempo ocupados que se solapan o que son inmediatamente contiguos.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  // Ordenar por hora de inicio
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (current.start <= lastMerged.end) {
      // Hay solapamiento o continuidad perfecta, extendemos el final
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Genera la lista de bloques libres del día restando los intervalos ocupados del horario laboral.
 */
export function getFreeBlocks(
  businessHours: BusinessHours,
  occupiedIntervals: TimeInterval[]
): TimeInterval[] {
  const dayStart = timeToMinutes(businessHours.start);
  const dayEnd = timeToMinutes(businessHours.end);

  if (dayStart >= dayEnd) return [];

  // Unir intervalos ocupados para simplificar
  const mergedOccupied = mergeIntervals(occupiedIntervals);

  const freeBlocks: TimeInterval[] = [];
  let currentStart = dayStart;

  for (const block of mergedOccupied) {
    // Acotar el bloque ocupado al horario laboral
    const blockStart = Math.max(block.start, dayStart);
    const blockEnd = Math.min(block.end, dayEnd);

    if (blockStart >= dayEnd) break;
    if (blockEnd <= dayStart) continue;

    if (blockStart > currentStart) {
      freeBlocks.push({ start: currentStart, end: blockStart });
    }
    currentStart = Math.max(currentStart, blockEnd);
  }

  if (currentStart < dayEnd) {
    freeBlocks.push({ start: currentStart, end: dayEnd });
  }

  return freeBlocks;
}

export interface BookingParams {
  barber_id: string;
  date: string;
  service_duration: number;
  minimum_bookable_service: number;
  businessHours: BusinessHours;
  existingAppointments: Appointment[];
  is_strict_mode: boolean;
}

/**
 * Calcula los horarios de inicio disponibles optimizados segun la modalidad:
 * 
 * - MODO ESTRICTO (is_strict_mode = true):
 *   1. Agendamiento por bordes (Edge-Snapping): Solo permite iniciar pegado al inicio del bloque o terminar pegado al final.
 *   2. Validacion de Residuo Mortal (Dead-Space Remainder Check): Si el sobrante (residuo) es mayor a 0 pero menor a minimum_bookable_service,
 *      entonces el candidato se descarta ya que dejaria un hueco inutilizable.
 * 
 * - MODO FLEXIBLE (is_strict_mode = false):
 *   1. Intervalos regulares: Genera horas cada 15 minutos (o el intervalo configurado) a lo largo de todo el bloque libre.
 *   2. Sin validacion de residuo: Mientras el servicio quepa completo, se permite el slot.
 */
export function getOptimizedSlots(params: BookingParams): string[] {
  const {
    barber_id,
    date,
    service_duration,
    minimum_bookable_service,
    businessHours,
    existingAppointments,
    is_strict_mode
  } = params;

  // 1. Mapeo y preparacion de los intervalos ocupados del dia
  const occupiedIntervals: TimeInterval[] = [];

  // Agregar almuerzo si esta definido
  if (businessHours.lunch_start && businessHours.lunch_end) {
    occupiedIntervals.push({
      start: timeToMinutes(businessHours.lunch_start),
      end: timeToMinutes(businessHours.lunch_end),
    });
  }

  // Agregar citas existentes
  for (const app of existingAppointments) {
    occupiedIntervals.push({
      start: timeToMinutes(app.start_time),
      end: timeToMinutes(app.end_time),
    });
  }

  // 2. Obtener bloques libres continuos
  const freeBlocks = getFreeBlocks(businessHours, occupiedIntervals);

  const perfectFits: string[] = [];
  const standardSlots: Set<string> = new Set(); // Evitar duplicaciones de slots

  // 3. Procesar cada bloque continuo
  for (const block of freeBlocks) {
    const blockLength = block.end - block.start;

    // Descartar si el bloque es mas corto que la duracion del servicio
    if (blockLength < service_duration) {
      continue;
    }

    if (is_strict_mode) {
      // --- LOGICA ESTRICTA (Edge-Snapping + Remainder Check) ---
      
      // Coincidencia perfecta ("Perfect Fit"): Ocupa exactamente todo el bloque libre (residuo = 0)
      if (blockLength === service_duration) {
        perfectFits.push(minutesToTime(block.start));
        continue;
      }

      // Si el bloque es mayor, analizamos el residuo restante
      const leftoverTime = blockLength - service_duration;

      // Residuo Mortal: Si el sobrante es menor que el servicio minimo que ofrece el barbero,
      // no se permite agendar en los extremos de este bloque porque dejaria un hueco invendible.
      if (leftoverTime > 0 && leftoverTime < minimum_bookable_service) {
        continue;
      }

      // Candidato A: Pegado al inicio del bloque libre (inicia en block.start)
      standardSlots.add(minutesToTime(block.start));

      // Candidato B: Pegado al final del bloque libre (inicia en block.end - service_duration)
      const startForEndSnapped = block.end - service_duration;
      standardSlots.add(minutesToTime(startForEndSnapped));

    } else {
      // --- LOGICA FLEXIBLE (Intervalos Regulares cada 15 min sin validacion de residuo) ---
      const step = 15;
      for (let min = block.start; min <= block.end - service_duration; min += step) {
        standardSlots.add(minutesToTime(min));
      }
    }
  }

  // Convertir el Set a un array ordenado cronologicamente
  const sortedStandardSlots = Array.from(standardSlots).sort((a, b) => {
    return timeToMinutes(a) - timeToMinutes(b);
  });

  // Priorizar "Perfect Fits" en el resultado final colocandolos primero
  const result = [...perfectFits, ...sortedStandardSlots];
  
  return result;
}

/**
 * Funcion wrapper heredada para mantener compatibilidad hacia atras.
 * Ejecuta getOptimizedSlots en modo estricto asumiendo un servicio minimo de 30 min por defecto.
 */
export function getOptimizedAvailableSlots(
  barber_id: string,
  date: string,
  service_duration: number,
  businessHours: BusinessHours,
  existingAppointments: Appointment[]
): string[] {
  return getOptimizedSlots({
    barber_id,
    date,
    service_duration,
    minimum_bookable_service: 30,
    businessHours,
    existingAppointments,
    is_strict_mode: true
  });
}
