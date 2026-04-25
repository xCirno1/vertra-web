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
 * POST /api/auth/login
 *
 * Proxies credentials to the Rust backend, then stores the returned JWT in
 * an httpOnly cookie (never exposed to client-side JS) and sets a companion
 * non-httpOnly `vertra-authed=1` cookie so the browser can detect the session.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const data = (await backendRes.json().catch(() => ({}))) as { error?: string };
    return NextResponse.json(
      { error: data.error ?? 'Login failed' },
      { status: backendRes.status },
    );
  }

  const data = (await backendRes.json()) as AuthResponse;
  const res = NextResponse.json({ user: data.user });

  const isProduction = process.env.NODE_ENV === 'production';

  // JWT — httpOnly, never readable by JS
  res.cookies.set(TOKEN_COOKIE, data.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });

  // Public indicator — lets client JS know the session exists
  res.cookies.set(AUTHED_COOKIE, '1', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });

  return res;
}
