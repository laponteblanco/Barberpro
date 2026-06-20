import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(url, serviceKey);

async function checkIndexes() {
  console.log("=== CHECKING DB INDEXES ===");

  // Querypg_indexes to see if our performance indexes exist
  const { data, error } = await supabase.rpc('get_indexes_check');

  if (error) {
    // If the helper RPC doesn't exist, we can run a raw SQL query or check via public endpoints if possible,
    // or try querying pg_catalog via select if it's exposed, but usually it's not.
    // Let's write a query to see if we can read indexes through some other way, or create an RPC to run it.
    console.log("RPC get_indexes_check failed/not found. Let's try creating a temporary RPC function to inspect pg_indexes.");
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.check_pg_indexes()
      RETURNS TABLE(tablename text, indexname text, indexdef text)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          t.tablename::text,
          t.indexname::text,
          t.indexdef::text
        FROM
          pg_indexes t
        WHERE
          t.schemaname = 'public';
      END;
      $$;
    `;

    // Wait, we can't run raw SQL directly unless we use an RPC. Is there any RPC to run SQL?
    // Let's check if there is an RPC we can use, or let's check the schema by querying pg_indexes if the service role key can access it directly.
    // Let's try querying pg_indexes directly as a table!
    const { data: indexes, error: directErr } = await supabase
      .from('pg_indexes' as any)
      .select('*')
      .eq('schemaname', 'public');

    if (directErr) {
      console.error("Direct query on pg_indexes failed:", directErr.message);
      
      // Let's try executing a select frompg_class/pg_index via RPC if available, or just check the speed of queries.
      // Let's query tables directly to see if query execution times are slow.
    } else {
      console.log("Direct query on pg_indexes succeeded!");
      console.log("Indexes found:", JSON.stringify(indexes, null, 2));
    }
  } else {
    console.log("RPC Check results:", data);
  }
}

checkIndexes();
