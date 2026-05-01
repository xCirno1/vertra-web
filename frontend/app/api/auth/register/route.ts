import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const TOKEN_COOKIE = 'vertra-token';
const AUTHED_COOKIE = 'vertra-authed';
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name?: string | null; avatar?: string | null };
}

/**
 * POST /api/auth/register
 *
 * Proxies registration to the Rust backend and sets the same session cookies
 * as the login route so the user is immediately signed in after registration.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[auth/register] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const data = (await backendRes.json().catch(() => ({}))) as { error?: string };
    return NextResponse.json(
      { error: data.error ?? 'Registration failed' },
      { status: backendRes.status },
    );
  }

  const data = (await backendRes.json()) as AuthResponse;
  const res = NextResponse.json({ user: data.user }, { status: 201 });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookies.set(TOKEN_COOKIE, data.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });

  res.cookies.set(AUTHED_COOKIE, '1', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });

  return res;
}
