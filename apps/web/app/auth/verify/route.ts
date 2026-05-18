import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/api';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3001';

interface VerifyResponse {
  sessionToken: string;
  isOnboarded: boolean;
  nickname: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token_required', req.url));
  }

  const apiRes = await fetch(
    `${GAME_SERVER}/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );

  if (!apiRes.ok) {
    let code = 'invalid_token';
    try {
      const body = (await apiRes.json()) as { error?: string };
      if (body.error) code = body.error;
    } catch {
      /* noop */
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, req.url));
  }

  const data = (await apiRes.json()) as VerifyResponse;
  const dest = data.isOnboarded ? '/play' : '/onboarding';

  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set(SESSION_COOKIE, data.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30일
  });
  return res;
}
