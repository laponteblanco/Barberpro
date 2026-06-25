import { getOptimizedSlots, BusinessHours, Appointment } from "../src/lib/booking-utils";

function runTest(
  name: string,
  service_duration: number,
  minimum_bookable_service: number,
  businessHours: BusinessHours,
  existingAppointments: Appointment[],
  is_strict_mode: boolean,
  expected: string[]
) {
  const result = getOptimizedSlots({
    barber_id: "test-barber",
    date: "2026-06-25",
    service_duration,
    minimum_bookable_service,
    businessHours,
    existingAppointments,
    is_strict_mode
  });
  const success = JSON.stringify(result) === JSON.stringify(expected);
  console.log(`[TEST] ${name}: ${success ? "PASSED" : "FAILED"}`);
  if (!success) {
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got:      ${JSON.stringify(result)}`);
  }
}

// ================= MODO ESTRICTO =================

// Escenario 1: Agenda vacía, servicio 60 min, mínimo 30 min.
// Bloque: 08:00 a 12:00 (240 min).
// Candidatos bordes: 08:00 y 11:00.
// Residuo: 180 min. Como 180 >= 30, ambos válidos.
runTest(
  "Estricto: Agenda vacía, servicio 60 min",
  60,
  30,
  { start: "08:00", end: "12:00" },
  [],
  true,
  ["08:00", "11:00"]
);

// Escenario 2: Residuo mortal (15 minutos) con mínimo servicio de 30 minutos.
// Bloque: 10:00 a 11:00 (60 min). Servicio: 45 min.
// Residuo: 15 min. Como 15 < 30 (servicio mínimo), se descartan los candidatos del borde.
runTest(
  "Estricto: Bloque de 60 min con servicio de 45 min y mínimo de 30 (descarta todo)",
  45,
  30,
  { start: "10:00", end: "11:00" },
  [],
  true,
  []
);

// Escenario 3: Residuo permitido (30 minutos) con mínimo servicio de 30 minutos.
// Bloque: 10:00 a 11:15 (75 min). Servicio: 45 min.
// Residuo: 30 min. Como 30 >= 30, se permiten los bordes: 10:00 (inicio) y 10:30 (final).
runTest(
  "Estricto: Bloque de 75 min con servicio de 45 min y mínimo de 30 (permite bordes)",
  45,
  30,
  { start: "10:00", end: "11:15" },
  [],
  true,
  ["10:00", "10:30"]
);

// Escenario 4: Perfect Fit.
// Bloque: 10:00 a 10:45 (45 min). Servicio: 45 min.
// Residuo: 0 min (Perfect Fit).
runTest(
  "Estricto: Perfect Fit de 45 min",
  45,
  30,
  { start: "10:00", end: "10:45" },
  [],
  true,
  ["10:00"]
);


// ================= MODO FLEXIBLE =================

// Escenario 5: Flexible. Bloque de 10:00 a 11:15 (75 min). Servicio: 45 min.
// Intervalos cada 15 min:
// 10:00 (finaliza 10:45, cabe)
// 10:15 (finaliza 11:00, cabe)
// 10:30 (finaliza 11:15, cabe)
// 10:45 (finaliza 11:30, excede bloque)
// Esperado: ["10:00", "10:15", "10:30"]
runTest(
  "Flexible: Bloque de 75 min con servicio de 45 min (retorna intervalos de 15 min)",
  45,
  30,
  { start: "10:00", end: "11:15" },
  [],
  false,
  ["10:00", "10:15", "10:30"]
);

// Escenario 6: Flexible con almuerzo.
// Jornada: 09:00 a 13:00. Almuerzo: 11:00 a 12:00. Servicio: 60 min.
// Bloques libres:
// Block 1: 09:00 a 11:00 (120 min) -> Slots: 09:00, 09:15, 09:30, 09:45, 10:00.
// Block 2: 12:00 a 13:00 (60 min) -> Slots: 12:00.
runTest(
  "Flexible: Con almuerzo, servicio de 60 min",
  60,
  30,
  { start: "09:00", end: "13:00", lunch_start: "11:00", lunch_end: "12:00" },
  [],
  false,
  ["09:00", "09:15", "09:30", "09:45", "10:00", "12:00"]
);
