import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/textures/[id]/url
 * Returns a presigned R2 download URL for the given texture.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const backendRes = await fetch(`${BACKEND_URL}/textures/${id}/url`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const body: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(body, { status: backendRes.status });
}

/**
 * DELETE /api/textures/[id]
 * Deletes a texture from R2 and the database.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const backendRes = await fetch(`${BACKEND_URL}/textures/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const body: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(body, { status: backendRes.status });
}
