import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/**
 * GET /api/scripts/s/[token]
 * Downloads the script VFS blob for a published project by share token.
 * No authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/scripts/s/${token}`);
  } catch (err) {
    console.error('[scripts/s] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }

  if (backendRes.status === 404) {
    return NextResponse.json({ files: {}, bindings: {} }, { status: 200 });
  }

  const data: unknown = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}