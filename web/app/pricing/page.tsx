/**
 * Pricing Page for CodeContextPro-MES
 * Shows Polar.sh pricing plans with actual product IDs
 */

'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

interface PricingTier {
  name: string;
  price: string;
  operations: number;
  productId: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    operations: 50,
    productId: '76d00d3d-a4ec-4e31-8e64-94f23cfef7f0',
    features: [
      '50 CLI operations/month',
      'Basic memory storage',
      'Local SQLite database',
      'Community support',
      'Open source CLI'
    ]
  },
  {
    name: 'Standard',
    price: '$19',
    operations: 2000,
    productId: 'cf7174a1-783c-4ada-bbb3-03e3a5dcb138',
    features: [
      '2,000 CLI operations/month',
      'Enhanced memory storage',
      'Web dashboard access',
      'API access for LLM integration',
      'Priority email support',
      'Advanced search capabilities'
    ],
    popular: true
  },
  {
    name: 'Pro',
    price: '$29',
    operations: 4000,
    productId: 'a11566ad-11c3-42f1-9d2a-bbad298aed56',
    features: [
      '4,000 CLI operations/month',
      'Premium memory storage',
      'Team collaboration features',
      'Custom LLM integrations',
      'Priority support',
      'Advanced analytics',
      'Custom export options'
    ]
  }
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (productId: string, tierName: string) => {
    if (!session?.user) {
      // Redirect to signup if not authenticated
      window.location.href = '/auth/signup';
      return;
    }

    setLoading(productId);

    try {
      // Create checkout session with Polar.sh
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/dashboard?upgraded=${tierName}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redirect to Polar.sh checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Unlock the full power of AI memory with CodeContextPro-MES
          </p>
          <p className="mt-2 text-lg text-gray-500">
            All plans include our powerful CLI tool and local-first architecture
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.productId}
              className={`relative rounded-2xl border ${
                tier.popular
                  ? 'border-indigo-500 shadow-lg scale-105'
                  : 'border-gray-200 shadow-sm'
              } bg-white p-8`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {tier.price}
                  </span>
                  {tier.price !== '$0' && (
                    <span className="text-lg text-gray-500">/month</span>
                  )}
                </div>
                <p className="mt-2 text-lg text-gray-600">
                  {tier.operations.toLocaleString()} operations/month
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {tier.name === 'Free' ? (
                  <Link
                    href="/auth/signup"
                    className="block w-full text-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Get Started Free
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier.productId, tier.name)}
                    disabled={loading === tier.productId}
                    className={`w-full px-6 py-3 rounded-md font-bold transition-colors ${
                      tier.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } disabled:opacity-50`}
                  >
                    {loading === tier.productId ? 'Loading...' : `Subscribe to ${tier.name}`}
                  </button>
                )}
              </div>

              <p className="mt-4 text-xs text-gray-500 text-center">
                Product ID: {tier.productId}
              </p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What counts as an operation?
              </h3>
              <p className="text-gray-600">
                Each CLI command that stores or retrieves memory counts as one operation. 
                This includes remember, recall, and status commands.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can change your plan at any time through your dashboard. 
                Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Absolutely. Your data is stored locally in SQLite databases on your machine. 
                We never see or store your memory content.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 30-day money-back guarantee for all paid plans. 
                Contact support for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to supercharge your AI workflows?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of developers using CodeContextPro-MES for persistent AI memory
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-bold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
