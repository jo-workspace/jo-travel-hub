import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  verifyAuthToken,
  getShareCookieName,
  verifyCompanionShareToken,
} from '@/lib/auth';

export function proxy(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyAuthToken(token)) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // 旅伴專屬分享路由：/share/[tripId]
  const shareMatch = pathname.match(/^\/share\/([^/]+)$/);
  if (shareMatch) {
    const tripId = decodeURIComponent(shareMatch[1]);
    const cookieName = getShareCookieName(tripId);
    const urlToken = req.nextUrl.searchParams.get('token');
    const cookieToken = req.cookies.get(cookieName)?.value;

    if (urlToken && verifyCompanionShareToken(tripId, urlToken)) {
      const res = NextResponse.next();
      res.cookies.set(cookieName, urlToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
      });
      return res;
    }

    if (verifyCompanionShareToken(tripId, cookieToken)) {
      return NextResponse.next();
    }
  }

  // 允許持有合法旅伴 Cookie 的使用者在行程地圖解析短網址座標
  if (pathname === '/api/resolve-maps') {
    const hasValidShareCookie = req.cookies.getAll().some((c) => {
      if (!c.name.startsWith('hub_share_')) return false;
      const referer = req.headers.get('referer') || '';
      const refMatch = referer.match(/\/share\/([^/?#]+)/);
      if (!refMatch) return false;
      const tripId = decodeURIComponent(refMatch[1]);
      return c.name === getShareCookieName(tripId) && verifyCompanionShareToken(tripId, c.value);
    });
    if (hasValidShareCookie) {
      return NextResponse.next();
    }
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!login|api/login|apple-icon|apple-touch-icon|icon|api/og|sw\\.js|manifest|manifest\\.json|manifest\\.webmanifest|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|webmanifest|json)$).*)',
  ],
};
