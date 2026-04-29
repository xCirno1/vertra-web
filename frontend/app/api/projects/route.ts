import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/projects
 * Lists all projects for the authenticated user.
 */
export async function GET(req: NextRequest) {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/projects`, {
      headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    });
  } catch (err) {
    console.error('[projects] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const body: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(body, { status: backendRes.status });
}

/**
 * POST /api/projects
 * Creates a new project.
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
    backendRes = await fetch(`${BACKEND_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(req) },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[projects] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
