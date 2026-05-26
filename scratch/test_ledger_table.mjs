import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('staff_ledger').select('*').limit(1);
  if (error) {
    console.log("❌ Table 'staff_ledger' does not exist or error occurred:", error.message);
  } else {
    console.log("✅ Table 'staff_ledger' exists!", data);
  }
}

check();
