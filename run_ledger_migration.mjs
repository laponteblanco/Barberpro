import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  'https://vsslcbsdvxbsfivcfxfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk'
);

const sql = fs.readFileSync('./supabase/migrations/019_create_staff_ledger.sql', 'utf-8');

console.log('Running migration: 019_create_staff_ledger.sql...');
const { data, error } = await supabase.rpc('exec_sql', { query: sql });

if (error) {
  console.error('RPC failed, trying direct approach...', error);
  
  const res = await fetch('https://vsslcbsdvxbsfivcfxfd.supabase.co/pg', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk`
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!res.ok) {
    console.error('Direct approach also failed:', await res.text());
  } else {
    console.log('✅ Migration 019 completed successfully!');
  }
} else {
  console.log('✅ Migration 019 completed successfully!', data);
}
