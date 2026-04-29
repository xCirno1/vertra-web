import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/vtr/[projectId]
 * Proxies the download request to the Rust backend, forwarding the
 * Authorization header so the backend can authenticate the user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/vtr/${projectId}`, {
      headers: authHeader(req),
    });
  } catch (err) {
    console.error('[vtr] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const body = await backendRes.text();
    return new NextResponse(body, { status: backendRes.status });
  }

  const bytes = await backendRes.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

/**
 * PUT /api/vtr/[projectId]
 * Proxies the binary upload to the Rust backend, forwarding the
 * Authorization header so the backend can authenticate the user.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const body = await req.arrayBuffer();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/vtr/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...authHeader(req),
      },
      body,
    });
  } catch (err) {
    console.error('[vtr] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new NextResponse(text, { status: backendRes.status });
  }

  const json = await backendRes.json();
  return NextResponse.json(json, { status: backendRes.status });
}
