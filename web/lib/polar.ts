/**
 * Polar.sh Integration for CodeContextPro-MES
 * Handles subscription management and product tiers
 */

interface PolarConfig {
  accessToken: string;
  organizationId: string;
}

interface PolarCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

interface PolarSubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  metadata?: Record<string, any>;
}

interface PolarProduct {
  id: string;
  name: string;
  description?: string;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    recurring?: {
      interval: 'month' | 'year';
    };
  }>;
}

export class PolarService {
  private config: PolarConfig;
  private baseUrl = 'https://api.polar.sh/v1';

  constructor() {
    this.config = {
      accessToken: process.env.POLAR_ACCESS_TOKEN || '',
      organizationId: process.env.POLAR_ORGANIZATION_ID || '',
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Customer management
  async createCustomer(email: string, name?: string): Promise<PolarCustomer> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        email,
        name,
        organization_id: this.config.organizationId,
      }),
    });
  }

  async getCustomer(customerId: string): Promise<PolarCustomer> {
    return this.request(`/customers/${customerId}`);
  }

  async getCustomerByEmail(email: string): Promise<PolarCustomer | null> {
    try {
      const response = await this.request(`/customers?email=${encodeURIComponent(email)}`);
      return response.data?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  // Subscription management
  async getCustomerSubscriptions(customerId: string): Promise<PolarSubscription[]> {
    const response = await this.request(`/customers/${customerId}/subscriptions`);
    return response.data || [];
  }

  async createCheckoutSession(productId: string, customerId: string, successUrl: string, cancelUrl: string) {
    return this.request('/checkout/sessions', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        customer_id: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });
  }

  // Product management
  async getProducts(): Promise<PolarProduct[]> {
    const response = await this.request(`/organizations/${this.config.organizationId}/products`);
    return response.data || [];
  }

  async getProduct(productId: string): Promise<PolarProduct> {
    return this.request(`/products/${productId}`);
  }

  // Subscription tier helpers
  getSubscriptionTier(subscriptions: PolarSubscription[]): string {
    if (!subscriptions.length) return 'free';

    const activeSubscription = subscriptions.find(sub => sub.status === 'active');
    if (!activeSubscription) return 'free';

    // Map your actual Polar.sh product IDs to tiers
    const tierMap: Record<string, string> = {
      '76d00d3d-a4ec-4e31-8e64-94f23cfef7f0': 'free',     // Free tier/$0 - 50 operations
      'cf7174a1-783c-4ada-bbb3-03e3a5dcb138': 'standard', // Standard $19/month - 2,000 operations
      'a11566ad-11c3-42f1-9d2a-bbad298aed56': 'pro',      // Pro $29/month - 4,000 operations
    };

    return tierMap[activeSubscription.product_id] || 'free';
  }

  getTierLimits(tier: string) {
    const limits = {
      free: {
        memoryLimit: 500,        // Conservative memory limit for free
        apiCallLimit: 50,        // 50 operations as per your Polar plan
        organizationLimit: 1,
        features: ['basic-memory', 'cli-access'],
        price: '$0',
        productId: '76d00d3d-a4ec-4e31-8e64-94f23cfef7f0',
      },
      standard: {
        memoryLimit: 5000,       // More memory for paid users
        apiCallLimit: 2000,      // 2,000 operations as per your Polar plan
        organizationLimit: 3,
        features: ['basic-memory', 'cli-access', 'web-interface', 'api-access', 'priority-support'],
        price: '$19/month',
        productId: 'cf7174a1-783c-4ada-bbb3-03e3a5dcb138',
      },
      pro: {
        memoryLimit: 20000,      // Premium memory for pro users
        apiCallLimit: 4000,      // 4,000 operations as per your Polar plan
        organizationLimit: 10,
        features: ['basic-memory', 'cli-access', 'web-interface', 'api-access', 'advanced-search', 'team-collaboration', 'priority-support', 'custom-integrations'],
        price: '$29/month',
        productId: 'a11566ad-11c3-42f1-9d2a-bbad298aed56',
      },
    };

    return limits[tier] || limits.free;
  }
}

export const polar = new PolarService();
