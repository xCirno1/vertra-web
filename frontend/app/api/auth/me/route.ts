import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const TOKEN_COOKIE = 'vertra-token';

/**
 * GET /api/auth/me
 *
 * Validates the session by forwarding the httpOnly JWT to the Rust backend's
 * `GET /auth/me` endpoint. Returns the user profile when authenticated, or
 * 401 when the cookie is absent or invalid.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!backendRes.ok) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const data: unknown = await backendRes.json();
  return NextResponse.json(data);
}
