import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST /api/textures/upload
 * Proxies a multipart upload directly to the Rust backend.
 */
export async function POST(req: NextRequest) {
  // Forward the raw FormData body without re-parsing to preserve the multipart boundary.
  const formData = await req.formData();

  const backendRes = await fetch(`${BACKEND_URL}/textures/upload`, {
    method: 'POST',
    headers: { ...authHeader(req) },
    // Passing FormData lets the Fetch API set the correct Content-Type boundary automatically.
    body: formData,
  });

  const body: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(body, { status: backendRes.status });
}
