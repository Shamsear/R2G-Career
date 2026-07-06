import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'solo-admin-secret-key-1234567890');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /solo-tour/admin routes (excluding login)
  if (pathname.startsWith('/solo-tour/admin') && pathname !== '/solo-tour/admin/login') {
    const sessionCookie = request.cookies.get('solo_admin_session')?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/solo-tour/admin/login', request.url));
    }

    try {
      await jwtVerify(sessionCookie, SECRET_KEY);
    } catch (err) {
      // Invalid session, redirect and clear cookie
      const response = NextResponse.redirect(new URL('/solo-tour/admin/login', request.url));
      response.cookies.delete('solo_admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matches all routes under /solo-tour/admin
  matcher: ['/solo-tour/admin/:path*'],
};
