/**
 * User Tier Limits API
 * Returns the current user's subscription tier and limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { polar } from '@/lib/polar';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's subscription tier (default to free)
    const userTier = session.user.subscriptionTier || 'free';
    
    // Get tier limits from Polar.sh service
    const limits = polar.getTierLimits(userTier);

    return NextResponse.json({
      success: true,
      tier: userTier,
      limits: {
        memoryLimit: limits.memoryLimit,
        apiCallLimit: limits.apiCallLimit,
        organizationLimit: limits.organizationLimit,
        features: limits.features,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        subscriptionTier: userTier,
        memoryUsage: session.user.memoryUsage || 0,
        apiCallsThisMonth: session.user.apiCallsThisMonth || 0,
      }
    });

  } catch (error) {
    console.error('Error fetching tier limits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tier limits' },
      { status: 500 }
    );
  }
}
