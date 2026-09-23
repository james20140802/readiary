import { NextResponse } from 'next/server';
import { getReflectionFeature } from '@/lib/features/entry-reflections';
export async function GET() {
  return NextResponse.json(await getReflectionFeature(), {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });
}
