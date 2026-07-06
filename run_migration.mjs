import 'dotenv/config';
// One-time migration script to fix FK constraint
// Run with: node run_migration.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
  ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
  
  ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.clients(id);
`;

const { data, error } = await supabase.rpc('exec_sql', { query: sql });

if (error) {
  console.error('RPC failed, trying direct approach...');
  
  // Alternative: use the management API
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
    console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log(sql);
  } else {
    console.log('✅ Migration completed successfully!');
  }
} else {
  console.log('✅ Migration completed successfully!', data);
}
