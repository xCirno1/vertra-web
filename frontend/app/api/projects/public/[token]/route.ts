import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/**
 * GET /api/projects/public/[token]
 * Returns stripped project data for a published project.
 * No authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const backendRes = await fetch(`${BACKEND_URL}/projects/s/${token}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
