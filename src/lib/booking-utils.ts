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
    return date.getHours() * 60 + date.getMinutes();
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

/**
 * Calcula los horarios de inicio disponibles optimizados para evitar huecos huérfanos de exactamente 15 minutos.
 *
 * Regla de negocio crítica (Snap-to-Adjacent):
 * 1. Solo permite que la nueva reserva inicie pegada al inicio del bloque libre, o termine pegada al final.
 * 2. Si el espacio sobrante es exactamente 15 minutos, ese candidato se invalida para evitar huecos inútiles.
 * 3. Si el hueco dura exactamente lo mismo que el servicio ("Perfect Fit"), se devuelve con prioridad máxima.
 *
 * @returns Un arreglo de strings con los horarios de inicio disponibles ordenados (Perfect Fits primero, luego el resto de manera cronológica).
 */
export function getOptimizedAvailableSlots(
  barber_id: string,
  date: string,
  service_duration: number,
  businessHours: BusinessHours,
  existingAppointments: Appointment[]
): string[] {
  // 1. Mapeo y preparación de los intervalos ocupados del día
  const occupiedIntervals: TimeInterval[] = [];

  // Agregar almuerzo si está definido
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

    // Descartar si el bloque es más corto que la duración del servicio
    if (blockLength < service_duration) {
      continue;
    }

    // Coincidencia perfecta ("Perfect Fit"): Ocupa exactamente todo el bloque libre
    if (blockLength === service_duration) {
      perfectFits.push(minutesToTime(block.start));
      continue;
    }

    // Si el bloque es mayor, evaluamos los dos puntos de anclaje (Regla Snap-to-Adjacent):
    const leftoverTime = blockLength - service_duration;

    // Si el espacio sobrante es exactamente 15 minutos, ubicar la cita en cualquier extremo
    // dejará un hueco de 15 minutos en el otro extremo. Por lo tanto, no se permite ninguna reserva en este bloque.
    if (leftoverTime === 15) {
      continue;
    }

    // Candidato A: Pegado al inicio del bloque libre (inicia en block.start)
    // El espacio muerto restante queda al final del bloque: de (block.start + service_duration) a block.end.
    // Como leftoverTime !== 15 (ya validado arriba), este slot es seguro.
    standardSlots.add(minutesToTime(block.start));

    // Candidato B: Pegado al final del bloque libre (termina en block.end, inicia en block.end - service_duration)
    // El espacio muerto restante queda al inicio del bloque: de block.start a (block.end - service_duration).
    // Como leftoverTime !== 15, este slot también es seguro.
    const startForEndSnapped = block.end - service_duration;
    standardSlots.add(minutesToTime(startForEndSnapped));
  }

  // Convertir el Set de standard slots a un array ordenado cronológicamente
  const sortedStandardSlots = Array.from(standardSlots).sort((a, b) => {
    return timeToMinutes(a) - timeToMinutes(b);
  });

  // Priorizar "Perfect Fits" colocándolos primero, seguidos por los slots estándar
  const result = [...perfectFits, ...sortedStandardSlots];
  
  return result;
}
