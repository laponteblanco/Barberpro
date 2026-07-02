import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatest() {
  console.log("Checking 15 latest appointments in DB...");
  const { data, error } = await supabase
    .from('appointments')
    .select('*, client:clients(full_name)')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data.map(a => ({
      id: a.id,
      client_name: a.client?.full_name,
      start: a.start_time,
      end: a.end_time,
      status: a.status,
      created_at: a.created_at
    })), null, 2));
  }
}

checkLatest();
