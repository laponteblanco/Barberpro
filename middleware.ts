import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 1. Ver si es dueño
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single();
    
    // 2. Ver si también tiene perfil de barbero
    const { data: barberProfile } = await supabase.from('barbers').select('id').eq('user_id', user.id).single();

    const isOwner = !!shop;
    const isHybrid = isOwner && !!barberProfile;
    const isOnlyBarber = !isOwner && !!barberProfile;

    const pathname = request.nextUrl.pathname;

    // Redirección Flexible para Rol Híbrido
    if (pathname.startsWith('/dashboard/admin') && !isOwner) {
      return NextResponse.redirect(new URL('/dashboard/staff', request.url))
    }

    if (pathname.startsWith('/dashboard/staff')) {
      if (isHybrid) {
        // PERMITIR EL ACCESO: Es dueño pero tiene rol híbrido
        return response;
      } else if (!isOnlyBarber) {
        // Bloquear si ni siquiera es barbero
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
