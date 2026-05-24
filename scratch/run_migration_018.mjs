import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

// Read the SQL migration file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlPath = path.join(__dirname, '../supabase/migrations/018_update_calculate_barber_commission.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  console.log("=== RUNNING DATABASE MIGRATION 018 FOR TIMEZONE-AWARE COMMISSIONS ===");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('RPC failed, trying direct approach...');
    try {
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
        console.log('✅ Migration 018 completed successfully via direct approach!');
      }
    } catch (err) {
      console.error('Direct fetch approach failed:', err);
    }
  } else {
    console.log('✅ Migration 018 completed successfully via RPC!', data);
  }
}

run();
