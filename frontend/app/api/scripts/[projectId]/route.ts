import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/scripts/[projectId]
 * Downloads the project's script VFS blob from R2 via the backend.
 * Returns the raw JSON body, or 404 if no scripts have been saved yet.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/scripts/${projectId}`, {
      headers: authHeader(req),
    });
  } catch (err) {
    console.error('[scripts] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  if (backendRes.status === 404) {
    // No scripts saved yet — return an empty VFS.
    return NextResponse.json({ files: {} }, { status: 200 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * PUT /api/scripts/[projectId]
 * Uploads the project's script VFS blob to R2 via the backend.
 * Body: ScriptVfs JSON.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/scripts/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(req) },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[scripts] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
