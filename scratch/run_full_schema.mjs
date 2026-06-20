import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = fs.readFileSync('./scratch/full_schema.sql', 'utf-8');

console.log('Running full schema migration...');

const { data, error } = await supabase.rpc('exec_sql', { query: sql });

if (error) {
  console.log('RPC exec_sql failed or not found, falling back to /pg REST endpoint...');
  
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!res.ok) {
    console.error('Direct approach failed:', await res.text());
  } else {
    console.log('✅ Full schema migration completed successfully!');
  }
} else {
  console.log('✅ Full schema migration completed successfully!', data);
}
