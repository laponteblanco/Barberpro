import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root proxy (formerly "middleware") — refreshes Supabase auth session on every request.
 * Without this, mobile browsers (Safari iOS / Android WebView) lose
 * the session because the token never gets rotated server-side.
 *
 * Next.js 16: renamed from middleware.ts → proxy.ts
 * Exported function must be named `proxy` (or default export).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico, manifest.json, sw.js, icons/
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
