import { getOptimizedAvailableSlots, BusinessHours, Appointment } from "../src/lib/booking-utils";

function runTest(
  name: string,
  service_duration: number,
  businessHours: BusinessHours,
  existingAppointments: Appointment[],
  expected: string[]
) {
  const result = getOptimizedAvailableSlots("test-barber", "2026-06-25", service_duration, businessHours, existingAppointments);
  const success = JSON.stringify(result) === JSON.stringify(expected);
  console.log(`[TEST] ${name}: ${success ? "PASSED" : "FAILED"}`);
  if (!success) {
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got:      ${JSON.stringify(result)}`);
  }
}

// Escenario 1: Agenda vacía, horario laboral 08:00 a 12:00, servicio 60 min.
// Bloque libre: 08:00 a 12:00 (240 min).
// Candidatos:
// A (Inicio): 08:00. Leftover: 180 min. (Válido)
// B (Final): 11:00. Leftover: 180 min. (Válido)
runTest(
  "Agenda vacía, servicio 60 min",
  60,
  { start: "08:00", end: "12:00" },
  [],
  ["08:00", "11:00"]
);

// Escenario 2: Perfect Fit. Un bloque libre de exactamente 45 mins y servicio de 45 mins.
runTest(
  "Perfect Fit - 45 min",
  45,
  { start: "10:00", end: "10:45" },
  [],
  ["10:00"]
);

// Escenario 3: Bloque genera hueco muerto de 15 mins.
// Bloque libre: 10:00 a 11:00 (60 min). Servicio: 45 min.
// Leftover: 15 min.
// Candidatos:
// A (Inicio): 10:00 -> deja 10:45 a 11:00 (15 min). (Inválido)
// B (Final): 10:15 -> deja 10:00 a 10:15 (15 min). (Inválido)
// Resultado esperado: [] (Ningún slot para evitar fragmentación)
runTest(
  "Bloque de 60 min con servicio de 45 min (Evita hueco de 15 min)",
  45,
  { start: "10:00", end: "11:00" },
  [],
  []
);

// Escenario 4: Bloque amplio con servicio.
// Bloque libre: 10:00 a 11:30 (90 min). Servicio: 60 min.
// Leftover: 30 min.
// Candidatos:
// A (Inicio): 10:00. Leftover: 30 min. (Válido)
// B (Final): 10:30. Leftover: 30 min. (Válido)
// Resultado esperado: ["10:00", "10:30"]
runTest(
  "Bloque de 90 min con servicio de 60 min",
  60,
  { start: "10:00", end: "11:30" },
  [],
  ["10:00", "10:30"]
);

// Escenario 5: Citas y almuerzo existentes.
// Jornada: 09:00 a 15:00. Almuerzo: 12:00 a 13:00.
// Citas: 09:30 a 10:30.
// Bloques libres resultantes:
// Block 1: 09:00 a 09:30 (30 min)
// Block 2: 10:30 a 12:00 (90 min)
// Block 3: 13:00 a 15:00 (120 min)
// Servicio: 60 min.
// Evaluaciones:
// Block 1 (30 min): Descartado (menor a 60 min).
// Block 2 (90 min): Leftover: 30 min. Slots: 10:30 (inicio), 11:00 (final). Ambos válidos.
// Block 3 (120 min): Leftover: 60 min. Slots: 13:00 (inicio), 14:00 (final). Ambos válidos.
runTest(
  "Día con almuerzo y citas existentes",
  60,
  { start: "09:00", end: "15:00", lunch_start: "12:00", lunch_end: "13:00" },
  [{ start_time: "09:30", end_time: "10:30" }],
  ["10:30", "11:00", "13:00", "14:00"]
);

// Escenario 6: Perfect Fit combinado con Standard Slots.
// Jornada: 09:00 a 12:00.
// Citas: 09:45 a 11:00.
// Bloques libres:
// Block 1: 09:00 a 09:45 (45 min)
// Block 2: 11:00 a 12:00 (60 min)
// Servicio: 45 min.
// Evaluaciones:
// Block 1 (45 min): Perfect Fit! Slot: 09:00.
// Block 2 (60 min): Leftover: 15 min. (Inválido para evitar hueco de 15 min).
// Resultado esperado: ["09:00"]
runTest(
  "Perfect Fit priorizado y bloque inválido descartado",
  45,
  { start: "09:00", end: "12:00" },
  [{ start_time: "09:45", end_time: "11:00" }],
  ["09:00"]
);
