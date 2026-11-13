import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken, createCompanionShareToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!verifyAuthToken(authCookie)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const tripId = req.nextUrl.searchParams.get('tripId')?.trim();
  if (!tripId) {
    return NextResponse.json({ error: '缺少 tripId' }, { status: 400 });
  }

  const { token } = createCompanionShareToken(tripId);
  return NextResponse.json({ tripId, token });
}
