import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST /api/projects/[id]/publish
 * Publishes the project and returns the updated project (with publishedToken).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const backendRes = await fetch(`${BACKEND_URL}/projects/${id}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * DELETE /api/projects/[id]/publish
 * Unpublishes the project.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const backendRes = await fetch(`${BACKEND_URL}/projects/${id}/publish`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
