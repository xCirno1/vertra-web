import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/projects/[id]
 * Returns a single project.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const backendRes = await fetch(`${BACKEND_URL}/projects/${id}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * PATCH /api/projects/[id]
 * Updates a project's metadata (name, script, thumbnail, etc.).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const backendRes = await fetch(`${BACKEND_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: { ...authHeader(req) },
  });

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
