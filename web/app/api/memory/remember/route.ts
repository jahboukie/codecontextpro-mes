/**
 * Memory API - Remember endpoint
 * Stores new memories with authentication and tier limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebMemoryEngine } from '@/lib/memory-engine';
import { auth } from '@/lib/auth';
import { polar } from '@/lib/polar';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Check authentication and tier limits
    let userId = null;
    let userTier = 'free';
    let memoryLimit = 1000;

    if (session?.user) {
      userId = session.user.id;
      userTier = session.user.subscriptionTier || 'free';

      // Get tier limits from Polar.sh
      const limits = polar.getTierLimits(userTier);
      memoryLimit = limits.memoryLimit;

      // Check memory limit (if not unlimited)
      if (memoryLimit > 0) {
        const currentUsage = session.user.memoryUsage || 0;
        if (currentUsage >= memoryLimit) {
          return NextResponse.json(
            {
              success: false,
              error: `Memory limit exceeded. Current: ${currentUsage}/${memoryLimit}. Upgrade your plan to store more memories.`,
              tier: userTier,
              usage: { current: currentUsage, limit: memoryLimit }
            },
            { status: 429 }
          );
        }
      }
    }

    const { content, context, type } = await request.json();

    // Validate input
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize memory engine
    const memoryEngine = new WebMemoryEngine(process.cwd());
    await memoryEngine.initialize();

    // Store memory
    const memoryId = memoryEngine.storeMemory(
      content,
      context || 'api-request',
      type || 'general'
    );

    return NextResponse.json({
      success: true,
      memoryId,
      message: 'Memory stored successfully',
      userTier,
      authenticated: !!session?.user,
      usage: session?.user ? {
        current: (session.user.memoryUsage || 0) + 1,
        limit: memoryLimit
      } : undefined
    });

  } catch (error) {
    console.error('Memory storage error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store memory' },
      { status: 500 }
    );
  }
}
