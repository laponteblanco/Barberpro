import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();
  const isAuthPage = url.pathname.startsWith("/auth");
  const isDashboardPage = url.pathname.startsWith("/dashboard");

  // Check if there are any active Supabase auth cookies
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.startsWith("sb-") || 
    cookie.name.includes("auth-token")
  );

  // If there are no auth cookies, and it's not a dashboard route, we can skip auth check
  if (!hasAuthCookie && !isDashboardPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: "lax",
              secure: true,
              path: "/",
            })
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user || null;

  // Protect dashboard routes — require authentication
  if (!user && isDashboardPage) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users trying to access auth pages back to dashboard
  if (user && isAuthPage) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // --- Hybrid Role Routing (Owner + Barber) ---
  if (user && isDashboardPage) {
    const { data: staffRecord } = await supabase
      .from("tenant_staff")
      .select("id, role")
      .eq("user_id", user.id)
      .single<{ id: string; role: string }>();

    const isOwner = staffRecord?.role === "owner";
    const hasStaffProfile = !!staffRecord;

    const pathname = url.pathname;

    // Block non-owners from admin routes
    if (pathname.startsWith("/dashboard/admin") && !isOwner) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Allow hybrid owners (owner + staff profile) to access staff routes
    // Block users with no staff profile from staff-specific routes
    if (pathname.startsWith("/dashboard/staff") && !hasStaffProfile) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
