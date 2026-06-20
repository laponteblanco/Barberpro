import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
