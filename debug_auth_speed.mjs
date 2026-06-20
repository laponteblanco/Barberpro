import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTEwNTgsImV4cCI6MjA5NTE2NzA1OH0.LoUSj7j7e5CDU-fBvxUxovqUulkbVrhIgOtVQ2LrGao';

const supabase = createClient(url, anonKey);

async function testAuthSpeed() {
  console.log("=== MEASURING SUPABASE AUTH SPEED ===");
  console.time("signInWithPassword latency");
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '1072714771@barberos.app',
    password: 'wrong_password_test'
  });

  console.timeEnd("signInWithPassword latency");
  console.log("Response error (expected):", error?.message);
}

testAuthSpeed();
