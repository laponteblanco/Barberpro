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
  ALTER TABLE public.cash_sessions 
  ADD COLUMN IF NOT EXISTS barbers_breakdown jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expected_cash numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_digital numeric(10,2) DEFAULT 0;
`;

async function run() {
  console.log("=== RUNNING DATABASE MIGRATION 016 FOR PROJECT:", url, "===");
  
  // Try directly using a script or since RPC is not available, we can just execute individual schema queries if possible,
  // or let's try running direct fetch query to /rest/v1/rpc/exec_sql if it exists or if we can run it.
  // Wait, if exec_sql RPC doesn't exist, we can't run DDL via postgrest.
  // We can let the user know they need to execute this SQL in the Supabase Dashboard.
  // But wait! Is there another RPC? Let's check if there is an alternative or if we can just report it.
  // We can try exec_sql. Since it was not found, DDL is typically run through the migrations during deploy,
  // or manually in SQL Editor.
  console.log("Migration SQL code:");
  console.log(sql);
}

run();
