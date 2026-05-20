// @ts-nocheck
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/register', '/mvp'];

/** Static asset patterns — never redirect these */
const STATIC_PATTERN = /^\/(_next|api|favicon\.ico|robots\.txt|sitemap\.xml)/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (STATIC_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated → redirect to login
  if (!token && !isPublic) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated → redirect away from login
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
