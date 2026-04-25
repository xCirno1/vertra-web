import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/projects/[id]/script
 * Returns the saved engine script for a project.
 * Proxies to the Rust backend `GET /projects/:id`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader(request),
  };

  const res = await fetch(`${API_BASE}/projects/${params.id}`, { headers });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Backend error ${res.status}` },
      { status: res.status },
    );
  }

  const project = (await res.json()) as { script?: string | null };
  return NextResponse.json({ script: project.script ?? null });
}

/**
 * PATCH /api/projects/[id]/script
 * Saves the engine script for a project.
 * Body: { script: string }
 * Proxies to the Rust backend `PATCH /projects/:id`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader(request),
  };

  let body: { script?: unknown };
  try {
    body = (await request.json()) as { script?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.script !== 'string') {
    return NextResponse.json(
      { error: '`script` must be a string' },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_BASE}/projects/${params.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ script: body.script }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Backend error ${res.status}` },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}
