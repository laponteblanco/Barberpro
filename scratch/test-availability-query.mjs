import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testQuery() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tenantId = "19a5fa6c-04ec-4b1e-a88d-3f33b82a59e4";
  const staffId = "862e39c9-84e3-42f7-ab8e-85afdbaa7600";
  const date = "2026-06-27";

  const startOfDayUTC = new Date(`${date}T00:00:00-05:00`).toISOString();
  const endOfDayUTC   = new Date(`${date}T23:59:59-05:00`).toISOString();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("start_time, end_time, service:services(duration_minutes)")
    .eq("staff_id", staffId)
    .eq("tenant_id", tenantId)
    .gte("start_time", startOfDayUTC)
    .lte("start_time", endOfDayUTC)
    .in("status", ["pending", "confirmed", "completed"]);

  console.log("Error:", error);
  console.log("Query Results:", JSON.stringify(appointments, null, 2));
}

testQuery();
