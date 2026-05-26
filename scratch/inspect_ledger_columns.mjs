import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function inspect() {
  // Try to insert a completely empty record to trigger column validation errors
  const { data, error } = await supabase.from('staff_ledger').insert({}).select();
  console.log("Mock Insert Result:", { data, error });
}

inspect();
