import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function run() {
  const sql = fs.readFileSync('supabase/migrations/025_composite_indexes.sql', 'utf-8');
  console.log('Applying migration 025_composite_indexes.sql...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing env variables');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('✅ Migration applied successfully.');
  }
}

run();
