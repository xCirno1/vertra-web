import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/**
 * GET /api/vtr/s/[token]
 * Downloads the VTR scene snapshot for a published project by share token.
 * No authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const backendRes = await fetch(`${BACKEND_URL}/api/vtr/s/${token}`);

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
