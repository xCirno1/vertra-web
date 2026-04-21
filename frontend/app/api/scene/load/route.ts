/**
 * Scene Load API Route
 * 
 * Handles loading a .vtr binary file and returning the data
 * 
 * POST /api/scene/load
 * Body: FormData with file field containing .vtr file
 * 
 * Response: {
 *   success: boolean
 *   data: base64-encoded binary data
 *   size: number (bytes)
 *   fileName: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.vtr')) {
      return NextResponse.json(
        { error: 'File must be a .vtr file' },
        { status: 400 }
      );
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Encode to base64 for JSON transmission
    const base64Data = buffer.toString('base64');

    return NextResponse.json(
      {
        success: true,
        data: base64Data,
        size: buffer.length,
        fileName: file.name,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scene Load API] Error:', message);
    
    return NextResponse.json(
      { error: 'Failed to load scene', details: message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { message: 'Scene load endpoint' },
    {
      headers: {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
