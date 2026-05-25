import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import "server-only";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de Supabase no detectadas en el servidor de Netlify.');
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl || 'https://tufallback.supabase.co',
    supabaseAnonKey || 'tufallback-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - cookies can't be set but session reads still work
          }
        },
      },
    }
  );
}

/** Admin client that bypasses RLS — use ONLY in trusted server contexts */
export async function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseUrl || 'https://tufallback.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'tufallback-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
