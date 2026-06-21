import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import "server-only";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error("❌ CRITICAL: Supabase URL or Service Key is missing in createAdminClient!");
  }

  return createSupabaseClient<Database>(
    url || 'https://tufallback.supabase.co',
    key || 'tufallback-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
