import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de Supabase no detectadas en el cliente.');
}

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl || 'https://tufallback.supabase.co',
    supabaseAnonKey || 'tufallback-anon-key'
  );
}
