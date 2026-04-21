/**
 * Scene Save API Route
 * 
 * Handles saving scene data as a .vtr binary file
 * 
 * POST /api/scene/save
 * Body: {
 *   data: ArrayBuffer (binary scene data from Scene.save_vtr())
 *   fileName: string (optional, defaults to 'scene.vtr')
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data: base64Data, fileName = 'scene.vtr' } = body;
    
    if (!base64Data) {
      return NextResponse.json(
        { error: 'Missing scene data' },
        { status: 400 }
      );
    }

    // Decode base64 to binary
    const binaryString = Buffer.from(base64Data, 'base64');

    return new NextResponse(binaryString, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': binaryString.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scene Save API] Error:', message);
    
    return NextResponse.json(
      { error: 'Failed to save scene', details: message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { message: 'Scene save endpoint' },
    {
      headers: {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
