import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/**
 * GET /api/vtr/[projectId]
 * Proxies the download request to the Rust backend, forwarding the
 * Authorization header so the backend can authenticate the user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const authHeader = req.headers.get('authorization');

  const backendRes = await fetch(`${BACKEND_URL}/api/vtr/${projectId}`, {
    headers: authHeader ? { Authorization: authHeader } : {},
  });

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

/**
 * PUT /api/vtr/[projectId]
 * Proxies the binary upload to the Rust backend, forwarding the
 * Authorization header so the backend can authenticate the user.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const authHeader = req.headers.get('authorization');
  const body = await req.arrayBuffer();

  const backendRes = await fetch(`${BACKEND_URL}/api/vtr/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body,
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new NextResponse(text, { status: backendRes.status });
  }

  const json = await backendRes.json();
  return NextResponse.json(json, { status: backendRes.status });
}
