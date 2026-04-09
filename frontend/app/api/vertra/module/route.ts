import { NextResponse } from 'next/server';

const MOCK_WASM_BINARY = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, // Magic bytes: \0asm
  0x01, 0x00, 0x00, 0x00, // Wasm version 1
]);

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 450));

  return new NextResponse(MOCK_WASM_BINARY, {
    headers: {
      'Content-Type': 'application/wasm',
      'Cache-Control': 'no-store',
      'X-Vertra-Module': 'mock-batch-renderer',
      'X-Vertra-Version': '0.1.0',
    },
  });
}