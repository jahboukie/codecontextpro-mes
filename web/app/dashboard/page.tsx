/**
 * Dashboard Page for CodeContextPro-MES
 * Shows user tier, usage, and memory management
 */

'use client';

import { useSession, authClient } from '@/lib/auth-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MemoryStats {
  totalMemories: number;
  totalSizeKB: number;
  lastUpdated: string;
}

interface TierLimits {
  memoryLimit: number;
  apiCallLimit: number;
  organizationLimit: number;
  features: string[];
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);

  useEffect(() => {
    // Fetch memory statistics
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/memory/status');
        const data = await response.json();
        if (data.success) {
          setMemoryStats(data.memory);
        }
      } catch (error) {
        console.error('Failed to fetch memory stats:', error);
      }
    };

    // Fetch tier limits
    const fetchTierLimits = async () => {
      try {
        const response = await fetch('/api/user/tier-limits');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTierLimits(data.limits);
          }
        } else {
          console.warn('Tier limits API not available yet, using defaults');
          // Set default free tier limits
          setTierLimits({
            memoryLimit: 500,
            apiCallLimit: 50,
            organizationLimit: 1,
            features: ['basic-memory', 'cli-access']
          });
        }
      } catch (error) {
        console.error('Failed to fetch tier limits:', error);
        // Set default free tier limits on error
        setTierLimits({
          memoryLimit: 500,
          apiCallLimit: 50,
          organizationLimit: 1,
          features: ['basic-memory', 'cli-access']
        });
      }
    };

    fetchStats();
    fetchTierLimits();
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">
            Sign in to access your dashboard
          </Link>
        </div>
      </div>
    );
  }

  const user = session.user;
  const tier = user.subscriptionTier || 'free';
  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    standard: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
  };

  const tierDisplayNames = {
    free: 'Free',
    standard: 'Standard',
    pro: 'Pro',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CodeContextPro Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name || user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${tierColors[tier] || tierColors.free}`}>
                {tierDisplayNames[tier] || 'Free'} Plan
              </span>
              <button
                type="button"
                onClick={() => authClient.signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Memory Usage Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🧠</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">
                      Memory Usage
                    </dt>
                    <dd className="text-lg font-bold text-gray-900">
                      {memoryStats?.totalMemories || 0} memories
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {tierLimits?.memoryLimit === -1
                        ? 'Unlimited'
                        : `${memoryStats?.totalMemories || 0} / ${tierLimits?.memoryLimit || 500}`
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* API Usage Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🔌</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">
                      API Calls This Month
                    </dt>
                    <dd className="text-lg font-bold text-gray-900">
                      {user.apiCallsThisMonth || 0}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {tierLimits?.apiCallLimit === -1
                        ? 'Unlimited'
                        : `${user.apiCallsThisMonth || 0} / ${tierLimits?.apiCallLimit || 50}`
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Size Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💾</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">
                      Storage Used
                    </dt>
                    <dd className="text-lg font-bold text-gray-900">
                      {memoryStats?.totalSizeKB || 0} KB
                    </dd>
                    <dd className="text-sm text-gray-500">
                      Last updated: {memoryStats?.lastUpdated || 'Never'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features & Actions */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/memory"
                  className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  🔍 Browse & Search Memories
                </Link>
                <Link
                  href="/api-docs"
                  className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  📚 API Documentation
                </Link>
                <Link
                  href="/integrations"
                  className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  🔗 LLM Integrations
                </Link>
              </div>
            </div>
          </div>

          {/* Upgrade Plan */}
          {tier === 'free' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                  Upgrade Your Plan
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get more memory, API calls, and advanced features.
                </p>
                <div className="space-y-3">
                  <Link
                    href="/pricing"
                    className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    View Pricing Plans
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Current Plan Features */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                Your Plan Features
              </h3>
              <ul className="space-y-2">
                {tierLimits?.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
