import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const sql = `
  ALTER TABLE public.tenant_staff 
  ADD COLUMN IF NOT EXISTS daily_commission_rates jsonb DEFAULT '{}'::jsonb;
`;

async function run() {
  console.log("=== RUNNING DATABASE MIGRATION 017 FOR PROJECT:", url, "==");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('RPC failed, trying direct approach...');
    const res = await fetch(`${url}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!res.ok) {
      console.error('Direct approach failed:', await res.text());
    } else {
      console.log('✅ Migration 017 completed successfully via direct approach!');
    }
  } else {
    console.log('✅ Migration 017 completed successfully!', data);
  }
}

run();
