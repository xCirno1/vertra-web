import { NextResponse } from 'next/server';

const TOKEN_COOKIE = 'vertra-token';
const AUTHED_COOKIE = 'vertra-authed';

/**
 * POST /api/auth/logout
 *
 * Clears both the httpOnly JWT cookie and the public session indicator.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  res.cookies.set(AUTHED_COOKIE, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return res;
}
