/**
 * Checkout Session API
 * Creates Polar.sh checkout sessions for subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { polar } from '@/lib/polar';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { productId, successUrl, cancelUrl } = await request.json();

    if (!productId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate product ID against our known products
    const validProductIds = [
      '76d00d3d-a4ec-4e31-8e64-94f23cfef7f0', // Free
      'cf7174a1-783c-4ada-bbb3-03e3a5dcb138', // Standard
      'a11566ad-11c3-42f1-9d2a-bbad298aed56', // Pro
    ];

    if (!validProductIds.includes(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Get or create Polar customer
    let polarCustomer;
    try {
      // Try to get existing customer
      polarCustomer = await polar.getCustomerByEmail(session.user.email);
      
      if (!polarCustomer) {
        // Create new customer
        polarCustomer = await polar.createCustomer(
          session.user.email,
          session.user.name || undefined
        );
      }
    } catch (error) {
      console.error('Failed to get/create Polar customer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create customer account' },
        { status: 500 }
      );
    }

    // Create checkout session
    try {
      const checkoutSession = await polar.createCheckoutSession(
        productId,
        polarCustomer.id,
        successUrl,
        cancelUrl
      );

      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      });

    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
