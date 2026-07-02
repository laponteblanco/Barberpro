import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecifics() {
  const ids = [
    "2703f8a4-068b-4b3b-bf96-fae708672469",
    "e6741704-c6a6-4c60-84e3-42f7ab8e85af",
    "40ac5e7d-abe8-454e-9658-2ba52f7a670c"
  ];
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .in('id', ids);

  console.log("Specific Appointments:", JSON.stringify(data, null, 2));
}

checkSpecifics();
