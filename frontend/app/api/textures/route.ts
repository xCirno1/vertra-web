import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_COOKIE = 'vertra-token';

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * GET /api/textures?project_id=<uuid>
 * Lists textures for the authenticated user (global, or also project-local when project_id is provided).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  const backendUrl = new URL(`${BACKEND_URL}/textures`);
  if (projectId) backendUrl.searchParams.set('project_id', projectId);

  const backendRes = await fetch(backendUrl.toString(), {
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });

  const body: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(body, { status: backendRes.status });
}
