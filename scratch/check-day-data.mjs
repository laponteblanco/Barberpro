import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDate() {
  const staffId = "e3e6b2be-1776-4e5e-ae48-2cec73d7059e"; // user_id or id? Let's check staff table for ID: 862e39c9-84e3-42f7-ab8e-85afdbaa7600
  const date = "2026-06-26";
  const startOfDay = `${date}T00:00:00-05:00`;
  const endOfDay = `${date}T23:59:59-05:00`;

  console.log("Checking appointments for staff 862e39c9-84e3-42f7-ab8e-85afdbaa7600 on 2026-06-26");

  const { data: appts } = await supabase
    .from('appointments')
    .select('*')
    .eq('staff_id', '862e39c9-84e3-42f7-ab8e-85afdbaa7600')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  const { data: blocks } = await supabase
    .from('agenda_blocks')
    .select('*')
    .eq('staff_id', '862e39c9-84e3-42f7-ab8e-85afdbaa7600')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  console.log("Appointments:", JSON.stringify(appts, null, 2));
  console.log("Agenda Blocks:", JSON.stringify(blocks, null, 2));
}

checkDate();
