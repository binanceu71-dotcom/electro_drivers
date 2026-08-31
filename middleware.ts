import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('electrodrivers_session')?.value;

  // Root path handling -> redirect immediately to auth or app
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/app/knowledge-base', request.url));
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Protect /app routes
  if (pathname.startsWith('/app')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/app/:path*'],
};
