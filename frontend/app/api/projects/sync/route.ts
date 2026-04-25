import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST /api/projects/sync
 * Bulk-syncs locally-created projects to the cloud.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/projects/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
