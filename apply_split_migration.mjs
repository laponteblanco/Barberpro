import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS split_cash_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS split_digital_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS split_digital_method text CHECK (split_digital_method IN ('card', 'nequi', 'daviplata', 'transfer'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_payment_method_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_method_check CHECK (payment_method IN ('cash', 'card', 'nequi', 'daviplata', 'transfer', 'split'));
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('RPC failed, trying REST approach via fetch...');
    const token = supabaseKey;
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const res = await fetch(`https://${projectRef}.supabase.co/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!res.ok) {
      console.error('REST approach failed:', await res.text());
    } else {
      console.log('✅ Migration applied via REST API');
    }
  } else {
    console.log('✅ Migration applied via RPC');
  }
}
run();
