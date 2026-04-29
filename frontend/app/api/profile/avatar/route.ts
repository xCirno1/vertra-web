import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST /api/profile/avatar
 * Proxies a multipart avatar upload to the Rust backend.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/profile/avatar`, {
      method: 'POST',
      headers: { ...authHeader(req) },
      body: formData,
    });
  } catch (err) {
    console.error('[profile/avatar] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * DELETE /api/profile/avatar
 * Removes the user's avatar.
 */
export async function DELETE(req: NextRequest) {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/profile/avatar`, {
      method: 'DELETE',
      headers: { ...authHeader(req) },
    });
  } catch (err) {
    console.error('[profile/avatar] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
