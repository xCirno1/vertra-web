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
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/projects/s/${token}`, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[projects/public] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}
