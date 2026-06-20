import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const queries = [
  'ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;',
  'ALTER TABLE public.tenant_staff ADD COLUMN IF NOT EXISTS access_pin TEXT;'
];

async function run() {
  for (const sql of queries) {
    console.log(`Running: ${sql}`);
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.log('RPC failed, trying direct PostgREST SQL executing endpoint...');
      try {
        const res = await fetch('https://vsslcbsdvxbsfivcfxfd.supabase.co/pg', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk`
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!res.ok) {
          console.error(`Direct approach failed for "${sql}":`, await res.text());
        } else {
          console.log(`✅ Success (Direct): ${sql}`);
        }
      } catch (e) {
        console.error('Exception on direct request:', e.message);
      }
    } else {
      console.log(`✅ Success (RPC): ${sql}`, data);
    }
  }
}

run();
