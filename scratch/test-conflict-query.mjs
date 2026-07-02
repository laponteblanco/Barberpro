import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testConflict() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const staff_id = "862e39c9-84e3-42f7-ab8e-85afdbaa7600";
  const date = "2026-06-27";
  const time = "08:00"; // 8:00 AM Bogota, i.e., 13:00 UTC
  const total_duration = 45; // Corte y Barba

  const start_time = new Date(`${date}T${time}:00-05:00`);
  const end_time = new Date(start_time.getTime() + total_duration * 60000);

  console.log("Checking conflict for new interval:", start_time.toISOString(), "to", end_time.toISOString());

  const { data: conflict, error } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, client:client_id(full_name)")
    .eq("staff_id", staff_id)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("start_time", end_time.toISOString())
    .gt("end_time", start_time.toISOString());

  console.log("Error:", error);
  console.log("Conflict query results:", JSON.stringify(conflict, null, 2));
}

testConflict();
