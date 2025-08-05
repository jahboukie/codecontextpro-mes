import { NextRequest, NextResponse } from 'next/server';
import { WebMemoryEngine } from '@/lib/memory-engine';

export async function GET(request: NextRequest) {
  try {
    // Initialize memory engine
    const memoryEngine = new WebMemoryEngine(process.cwd());
    await memoryEngine.initialize();

    // Get project info and stats
    const projectInfo = memoryEngine.getProjectInfo();
    const stats = memoryEngine.getStats();

    return NextResponse.json({
      success: true,
      project: {
        path: projectInfo.path,
        dbPath: projectInfo.dbPath
      },
      memory: {
        totalMemories: stats.totalMemories,
        totalSizeBytes: stats.totalSizeBytes,
        totalSizeKB: Math.round(stats.totalSizeBytes / 1024 * 10) / 10,
        lastUpdated: stats.lastUpdated
      },
      system: {
        ready: true,
        version: '2.0.0',
        engine: 'better-sqlite3'
      }
    });

  } catch (error) {
    console.error('Memory status error:', error);
    return NextResponse.json(
      { error: 'Failed to get memory status' },
      { status: 500 }
    );
  }
}
