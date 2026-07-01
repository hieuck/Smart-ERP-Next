import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/', '/login', '/register', '/mvp', '/privacy', '/terms'];

/** Static asset patterns — never redirect these */
const STATIC_PATTERN = /^\/(_next|api|favicon\.ico|robots\.txt|sitemap\.xml|manifest\.json|sw\.js|offline\.html)/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (STATIC_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p)));

  // Unauthenticated → redirect to login
  if (!token && !isPublic) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated → redirect away from login
  if (token && (pathname === '/login' || pathname === '/register')) {
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

