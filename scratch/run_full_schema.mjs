import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

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
