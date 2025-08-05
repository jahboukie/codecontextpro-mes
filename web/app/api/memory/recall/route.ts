import { NextRequest, NextResponse } from 'next/server';
import { WebMemoryEngine } from '@/lib/memory-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Initialize memory engine
    const memoryEngine = new WebMemoryEngine(process.cwd());
    await memoryEngine.initialize();

    // Search memories
    const memories = memoryEngine.searchMemories(query, { limit });

    return NextResponse.json({
      success: true,
      memories,
      count: memories.length,
      query
    });

  } catch (error) {
    console.error('Memory recall error:', error);
    return NextResponse.json(
      { error: 'Failed to recall memories' },
      { status: 500 }
    );
  }
}
