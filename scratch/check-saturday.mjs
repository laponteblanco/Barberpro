import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSaturday() {
  const date = "2026-06-27";
  const startOfDay = `${date}T00:00:00-05:00`;
  const endOfDay = `${date}T23:59:59-05:00`;

  console.log("Checking appointments for Saturday 2026-06-27");
  const { data, error } = await supabase
    .from('appointments')
    .select('*, client:clients(full_name)')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data.map(a => ({
      id: a.id,
      client_name: a.client?.full_name,
      start: a.start_time,
      end: a.end_time,
      status: a.status
    })), null, 2));
  }
}

checkSaturday();
