import { getFreeBlocks, getOptimizedSlots, timeToMinutes } from "../src/lib/booking-utils.ts";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
  const tenantId = "19a5fa6c-04ec-4b1e-a88d-3f33b82a59e4";
  const staffId = "862e39c9-84e3-42f7-ab8e-85afdbaa7600";
  const date = "2026-06-25";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startOfDayUTC = new Date(`${date}T00:00:00-05:00`).toISOString();
  const endOfDayUTC   = new Date(`${date}T23:59:59-05:00`).toISOString();

  const [
    { data: tenant },
    { data: staffRow },
    { data: appointments },
    { data: blocks }
  ] = await Promise.all([
    supabase.from("tenants").select("settings").eq("id", tenantId).single(),
    supabase.from("tenant_staff").select("working_hours").eq("id", staffId).eq("tenant_id", tenantId).single(),
    supabase.from("appointments").select("start_time, end_time, service:services(duration_minutes)").eq("staff_id", staffId).eq("tenant_id", tenantId).gte("start_time", startOfDayUTC).lte("start_time", endOfDayUTC).in("status", ["pending", "confirmed", "completed"]),
    supabase.from("agenda_blocks").select("start_time, end_time").eq("staff_id", staffId).eq("tenant_id", tenantId).gte("start_time", startOfDayUTC).lte("start_time", endOfDayUTC)
  ]);

  console.log("break_start / break_end values from DB:");
  const requestedDayIndex = new Date(`${date}T12:00:00Z`).getDay();
  const barberDay = staffRow.working_hours[requestedDayIndex];
  console.log("barberDay break info:", {
    has_break: barberDay.has_break,
    break_start: barberDay.break_start,
    break_end: barberDay.break_end
  });

  const decimalHoursToTimeString = (dec) => {
    const h = Math.floor(dec);
    const m = Math.round((dec - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const businessHours = {
    start: decimalHoursToTimeString(barberDay.start || 8),
    end: decimalHoursToTimeString(barberDay.end || 20),
    lunch_start: barberDay.has_break && barberDay.break_start !== null ? decimalHoursToTimeString(barberDay.break_start) : undefined,
    lunch_end: barberDay.has_break && barberDay.break_end !== null ? decimalHoursToTimeString(barberDay.break_end) : undefined,
  };

  console.log("Calculated businessHours:", businessHours);

  const existingAppointmentsMapped = (appointments ?? []).map((appt) => ({
    start_time: appt.start_time,
    end_time: appt.end_time
  }));
  const blockedTimesMapped = (blocks ?? []).map((block) => ({
    start_time: block.start_time,
    end_time: block.end_time
  }));

  console.log("Mapped appointments and blocks:", [...existingAppointmentsMapped, ...blockedTimesMapped]);

  // Let's trace occupied intervals
  const occupiedIntervals = [];
  if (businessHours.lunch_start && businessHours.lunch_end) {
    occupiedIntervals.push({
      start: timeToMinutes(businessHours.lunch_start),
      end: timeToMinutes(businessHours.lunch_end),
    });
  }
  for (const app of [...existingAppointmentsMapped, ...blockedTimesMapped]) {
    occupiedIntervals.push({
      start: timeToMinutes(app.start_time),
      end: timeToMinutes(app.end_time),
    });
  }

  console.log("Occupied intervals in minutes:", occupiedIntervals);

  const freeBlocks = getFreeBlocks(businessHours, occupiedIntervals);
  console.log("Free blocks calculated:", freeBlocks);

  const slots = getOptimizedSlots({
    barber_id: staffId,
    date,
    service_duration: 30,
    minimum_bookable_service: 30,
    businessHours,
    existingAppointments: [...existingAppointmentsMapped, ...blockedTimesMapped],
    is_strict_mode: true
  });
  console.log("Strict Mode slots:", slots);

  const slotsFlexible = getOptimizedSlots({
    barber_id: staffId,
    date,
    service_duration: 30,
    minimum_bookable_service: 30,
    businessHours,
    existingAppointments: [...existingAppointmentsMapped, ...blockedTimesMapped],
    is_strict_mode: false
  });
  console.log("Flexible Mode slots:", slotsFlexible);
}

debug();
