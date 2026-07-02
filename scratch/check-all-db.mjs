import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  const date = "2026-06-25";
  const startOfDay = `${date}T00:00:00-05:00`;
  const endOfDay = `${date}T23:59:59-05:00`;

  console.log("Checking ALL appointments and blocks in DB for 2026-06-26");

  const { data: appts } = await supabase
    .from('appointments')
    .select('*, client:clients(full_name)')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  const { data: blocks } = await supabase
    .from('agenda_blocks')
    .select('*')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  console.log("ALL Appointments:", JSON.stringify(appts, null, 2));
  console.log("ALL Agenda Blocks:", JSON.stringify(blocks, null, 2));
}

checkAll();
