import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function dump() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const date = "2026-06-27";
  const startOfDayUTC = new Date(`${date}T00:00:00-05:00`).toISOString();
  const endOfDayUTC   = new Date(`${date}T23:59:59-05:00`).toISOString();

  const { data: appts, error } = await supabase
    .from("appointments")
    .select(`
      id,
      start_time,
      end_time,
      status,
      tenant_id,
      staff_id,
      client:client_id(full_name),
      staff:staff_id(profiles(full_name)),
      service:service_id(name, duration_minutes)
    `)
    .gte("start_time", startOfDayUTC)
    .lte("start_time", endOfDayUTC)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("All Appointments on 2026-06-27:");
  appts.forEach(a => {
    console.log(`Date/Time: ${a.start_time} to ${a.end_time} | Client: ${a.client?.full_name} | Staff: ${a.staff?.profiles?.full_name || a.staff_id} | Service: ${a.service?.name} (${a.service?.duration_minutes}m) | Status: ${a.status}`);
  });
}

dump();
