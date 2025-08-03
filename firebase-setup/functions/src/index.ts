/**
 * CodeContextPro-MES Firebase Functions v2
 * Security-first payment processing and license management
 * 
 * Converted to 2nd Generation functions to resolve deployment issues
 */

import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as cors from 'cors';
import { Response, Request } from 'express';

interface StripeWebhookRequest extends Request {
    rawBody: Buffer;
}
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { defineSecret } from 'firebase-functions/params';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for all 2nd Gen functions
setGlobalOptions({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
});

// Define secrets using Firebase Secret Manager (v2 approach)
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const MEMORY_PRICE_ID = defineSecret('MEMORY_PRICE_ID');
const ENCRYPTION_MASTER_KEY = defineSecret('ENCRYPTION_MASTER_KEY');
const FIREBASE_WEB_API_KEY = defineSecret('FIREBASE_WEB_API_KEY');

// Note: Stripe instances are created within functions to access secrets properly

/**
 * CORS Handler with Security Restrictions
 */
const corsHandler = cors.default({
    origin: [
        'https://codecontextpro.com',
        'https://www.codecontextpro.com',
        'https://codecontextpro-mes.web.app',
        'https://codecontextpro-mes.firebaseapp.com',
        /\.codecontext\.pro$/,
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'https://localhost:5000'
    ],
    credentials: true,
    optionsSuccessStatus: 200
});

/**
 * Security Headers Middleware
 */
function addSecurityHeaders(res: Response): void {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' https://js.stripe.com; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com;",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
}

/**
 * Email Validation Function
 */
function validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
}

/**
 * Security: Detect potential secrets in input data
 */
function validateNoSecrets(data: Record<string, unknown>): void {
    const content = JSON.stringify(data);
    const secretPatterns = [
        new RegExp(['s', 'k', '_'].join('') + '[a-zA-Z0-9_]{20,}'),
        /AIza[0-9A-Za-z\-_]{35}/,
        new RegExp(['p', 'k', '_', 'live', '_'].join('') + '[a-zA-Z0-9]{24,}'),
        /password\s*[:=]\s*[^\s]+/i,
        /secret\s*[:=]\s*[^\s]+/i,
        /api[_\s]*key\s*[:=]\s*[^\s]+/i
    ];

    for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
            throw new HttpsError(
                'invalid-argument',
                'SECURITY: Potential secret detected in request data'
            );
        }
    }
}



/**
 * Get Pricing HTTP Function (v2)
 */
export const getPricingHttp = onRequest(
    { secrets: [MEMORY_PRICE_ID] },
    async (req: Request, res: Response) => {
        try {
            addSecurityHeaders(res);
            
            corsHandler(req, res, async () => {
                if (req.method !== 'GET') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return;
                }

                // Access secrets - fallback to env for local development
                const memoryPrice = process.env.LOCAL_MEMORY_PRICE_ID || process.env.MEMORY_PRICE_ID || MEMORY_PRICE_ID.value();

                if (!memoryPrice) {
                    console.error('❌ Critical configuration missing: Stripe price ID not configured');
                    res.status(500).json({ 
                        error: 'Pricing system configuration incomplete',
                        message: 'Pricing temporarily unavailable - contact administrator' 
                    });
                    return;
                }

                res.json({
                    pricing: {
                        memory: {
                            name: 'Memory Pro',
                            price: 19,
                            currency: 'USD',
                            period: 'month',
                            description: 'Building the Future Together - Support our API platform development',
                            limits: {
                                memory: 'unlimited',
                                projects: 'unlimited',
                                executions: 'coming-soon'
                            },
                            features: [
                                '5,000 Memory Recalls/month',
                                'Unlimited Projects',
                                'Persistent AI Memory',
                                'Support API Platform Development'
                            ],
                            stripePriceId: memoryPrice
                        }
                    },
                    mission: {
                        title: 'Building the Future Together',
                        description: 'Every CLI subscription funds development of our open API platform, democratizing persistent AI memory for the entire industry.'
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Error in getPricingHttp:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Create Checkout Session (v2)
 */
export const createCheckout = onRequest(
    { secrets: [STRIPE_SECRET_KEY, MEMORY_PRICE_ID] },
    async (req: Request, res: Response) => {
        try {
            addSecurityHeaders(res);
            
            corsHandler(req, res, async () => {
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return;
                }

                const { email, tier } = req.body;

                if (!email || typeof email !== 'string') {
                    res.status(400).json({ error: 'Email is required' });
                    return;
                }

                if (!tier || typeof tier !== 'string') {
                    res.status(400).json({ error: 'Tier is required' });
                    return;
                }

                if (!validateEmail(email)) {
                    res.status(400).json({ error: 'Invalid email format' });
                    return;
                }

                validateNoSecrets(req.body);

                // Validate tier (only 'memory' tier available now)
                if (tier !== 'memory') {
                    res.status(400).json({ 
                        error: 'Invalid tier. Only "memory" tier is available.',
                        availableTiers: ['memory']
                    });
                    return;
                }

                // Access secrets with fallback for local development
                const memoryPrice = process.env.LOCAL_MEMORY_PRICE_ID || process.env.MEMORY_PRICE_ID || MEMORY_PRICE_ID.value();

                if (!memoryPrice) {
                    console.error('❌ Critical configuration missing: Stripe price ID not configured');
                    res.status(500).json({ 
                        error: 'Payment system configuration incomplete',
                        message: 'Contact administrator - pricing not configured' 
                    });
                    return;
                }

                const priceIds: Record<string, string> = {
                    memory: memoryPrice
                };

                const priceId = priceIds[tier];
                if (!priceId) {
                    console.error('❌ Invalid tier requested:', tier);
                    res.status(400).json({ error: 'Missing price ID' });
                    return;
                }

                // Initialize Stripe with the secret key
                const stripeInstance = new Stripe(
                    process.env.LOCAL_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.value(),
                    { apiVersion: '2023-10-16' }
                );

                const session = await stripeInstance.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price: priceId,
                        quantity: 1
                    }],
                    mode: 'subscription',
                    customer_email: email,
                    success_url: `${req.headers.origin || 'http://localhost:5000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${req.headers.origin || 'http://localhost:5000'}/`,
                    metadata: {
                        tier,
                        email,
                        source: 'codecontextpro'
                    }
                });

                console.log('✅ Checkout session created', {
                    sessionId: session.id,
                    email: email.substring(0, 3) + '***',
                    tier,
                    timestamp: new Date().toISOString(),
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                res.json({
                    sessionId: session.id,
                    url: session.url
                });
            });
            
        } catch (error) {
            console.error('❌ Error in createCheckout:', error);
            
            if (error instanceof HttpsError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Please contact support' });
            }
        }
    }
);

/**
 * Stripe Webhook Handler (v2)
 */
export const stripeWebhook = onRequest(
    { secrets: [STRIPE_WEBHOOK_SECRET, ENCRYPTION_MASTER_KEY, STRIPE_SECRET_KEY] },
    async (req: Request, res: Response) => {
        try {
            addSecurityHeaders(res);

            if (req.method !== 'POST') {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }

            const sig = req.get('stripe-signature');
            const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET.value()).trim();

            if (!sig || !webhookSecret) {
                console.error('❌ Missing Stripe signature or webhook secret');
                res.status(400).json({ error: 'Missing signature or webhook secret' });
                return;
            }

            let event: Stripe.Event;

            try {
                const stripeInstance = new Stripe(
                    process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.value(),
                    { apiVersion: '2023-10-16' }
                );
                event = stripeInstance.webhooks.constructEvent((req as StripeWebhookRequest).rawBody, sig, webhookSecret);
            } catch (err) {
                console.error('❌ Webhook signature verification failed:', err);
                res.status(400).json({ error: 'Invalid signature' });
                return;
            }

            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as Stripe.Checkout.Session;
                
                console.log('✅ Payment successful for session:', session.id);
                
                const { tier, email } = session.metadata || {};
                
                if (!tier || !email) {
                    console.error('❌ Missing metadata in session:', session.id);
                    res.status(400).json({ error: 'Missing session metadata' });
                    return;
                }

                const licenseId = `license_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const masterKey = process.env.ENCRYPTION_MASTER_KEY || ENCRYPTION_MASTER_KEY.value();
                
                if (!masterKey) {
                    console.error('❌ Missing ENCRYPTION_MASTER_KEY for license creation');
                    res.status(500).json({ error: 'Encryption configuration error' });
                    return;
                }

                const keyInput = `${licenseId}:${email}:${masterKey}`;
                const apiKey = crypto.createHash('sha256').update(keyInput).digest('hex');
                
                const licenseData = {
                    id: licenseId,
                    email,
                    tier,
                    status: 'active',
                    stripeSessionId: session.id,
                    stripeCustomerId: session.customer,
                    apiKey,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    features: tier === 'memory' ? [
                        'unlimited_memory_recalls',
                        'unlimited_projects',
                        'persistent_memory',
                        'cloud_sync',
                        'api_platform_support'
                    ] : [
                        'basic_memory',
                        'limited_projects',
                        'standard_support'
                    ]
                };

                await admin.firestore()
                    .collection('licenses')
                    .doc(licenseId)
                    .set(licenseData);

                // Create Firebase Auth user (if new) as per Phase 2.1 spec
                try {
                    const userRecord = await admin.auth().createUser({
                        uid: `license-user-${licenseId.replace('license_', '')}`,
                        email: email,
                        emailVerified: true,
                        displayName: `CodeContext Pro User`
                    });

                    // Set custom claims separately
                    await admin.auth().setCustomUserClaims(userRecord.uid, {
                        licenseId: licenseId,
                        tier: tier,
                        licenseStatus: 'active'
                    });
                    console.log('✅ Firebase Auth user created for license:', licenseId);
                } catch (authError: unknown) {
                    if (authError && typeof authError === 'object' && 'code' in authError && authError.code === 'auth/email-already-exists') {
                        console.log('ℹ️ Firebase Auth user already exists for email:', email.substring(0, 3) + '***');
                        // Update existing user's custom claims
                        const existingUser = await admin.auth().getUserByEmail(email);
                        await admin.auth().setCustomUserClaims(existingUser.uid, {
                            licenseId: licenseId,
                            tier: tier,
                            licenseStatus: 'active'
                        });
                    } else {
                        console.error('❌ Failed to create Firebase Auth user:', authError);
                    }
                }

                // Update stats - earlyAdoptersSold as per Phase 2.1 spec
                if (tier === 'memory') {
                    await admin.firestore()
                        .collection('public')
                        .doc('stats')
                        .set({
                            earlyAdoptersSold: admin.firestore.FieldValue.increment(1),
                            memoryTierUsers: admin.firestore.FieldValue.increment(1),
                            totalRevenue: admin.firestore.FieldValue.increment(19),
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                }

                console.log('✅ License created with encryption key:', licenseId);
            }

            res.status(200).json({ received: true });

        } catch (error) {
            console.error('❌ Error in stripeWebhook:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
);

/**
 * Validate License Function (v2)
 */
export const validateLicense = onCall(
    { secrets: [ENCRYPTION_MASTER_KEY] },
    async (data) => {
        try {
            if (!data || typeof data !== 'object') {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid request data'
                );
            }

            validateNoSecrets(data.data || {});

            const { licenseKey } = (data.data as unknown) as { licenseKey: string };

            if (!licenseKey || typeof licenseKey !== 'string') {
                throw new HttpsError(
                    'invalid-argument',
                    'License key is required and must be a string'
                );
            }

            const licenseKeyRegex = /^license_\d+_[a-z0-9]{9}$/;
            if (!licenseKeyRegex.test(licenseKey)) {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid license key format'
                );
            }

            const licenseDoc = await admin.firestore()
                .collection('licenses')
                .doc(licenseKey)
                .get();

            if (!licenseDoc.exists) {
                console.log('❌ License not found:', licenseKey.substring(0, 12) + '***');
                throw new HttpsError(
                    'not-found',
                    'License key not found'
                );
            }

            const licenseData = licenseDoc.data();
            if (!licenseData) {
                throw new HttpsError(
                    'internal',
                    'License data corrupted'
                );
            }

            if (licenseData.status !== 'active') {
                console.log('❌ License inactive:', licenseKey.substring(0, 12) + '***', 'Status:', licenseData.status);
                throw new HttpsError(
                    'failed-precondition',
                    `License is ${licenseData.status}. Please contact support.`
                );
            }

            let apiKey = licenseData.apiKey;
            if (!apiKey) {
                const masterKey = process.env.ENCRYPTION_MASTER_KEY || ENCRYPTION_MASTER_KEY.value();
                
                if (!masterKey) {
                    console.error('❌ Missing ENCRYPTION_MASTER_KEY');
                    throw new HttpsError(
                        'internal',
                        'Encryption configuration error'
                    );
                }

                const keyInput = `${licenseData.id}:${licenseData.email}:${masterKey}`;
                apiKey = crypto.createHash('sha256').update(keyInput).digest('hex');
                
                await admin.firestore()
                    .collection('licenses')
                    .doc(licenseKey)
                    .update({
                        apiKey,
                        apiKeyGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                console.log('✅ Generated apiKey for license:', licenseKey.substring(0, 12) + '***');
            }

            console.log('✅ License validated successfully', {
                licenseId: licenseKey.substring(0, 12) + '***',
                email: licenseData.email.substring(0, 3) + '***',
                tier: licenseData.tier,
                timestamp: new Date().toISOString()
            });

            return {
                licenseId: licenseData.id,
                email: licenseData.email,
                tier: licenseData.tier,
                status: licenseData.status,
                features: licenseData.features,
                apiKey,
                activatedAt: licenseData.activatedAt,
                createdAt: licenseData.createdAt
            };

        } catch (error) {
            console.error('❌ Error in validateLicense:', error);
            
            if (error instanceof HttpsError) {
                throw error;
            }
            
            throw new HttpsError(
                'internal',
                'License validation failed'
            );
        }
    }
);

/**
 * Get Authentication Token (v2)
 */
export const getAuthToken = onCall(
    async (data) => {
        try {
            if (!data || typeof data !== 'object') {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid request data'
                );
            }

            validateNoSecrets(data.data || {});

            const { licenseKey } = (data.data as unknown) as { licenseKey: string };

            if (!licenseKey || typeof licenseKey !== 'string') {
                throw new HttpsError(
                    'invalid-argument',
                    'License key is required and must be a string'
                );
            }

            const licenseKeyRegex = /^license_\d+_[a-z0-9]{9}$/;
            if (!licenseKeyRegex.test(licenseKey)) {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid license key format'
                );
            }

            const licenseDoc = await admin.firestore()
                .collection('licenses')
                .doc(licenseKey)
                .get();

            if (!licenseDoc.exists) {
                console.log('❌ License not found for auth token:', licenseKey.substring(0, 12) + '***');
                throw new HttpsError(
                    'not-found',
                    'License key not found'
                );
            }

            const licenseData = licenseDoc.data();
            if (!licenseData) {
                throw new HttpsError(
                    'internal',
                    'License data corrupted'
                );
            }

            if (licenseData.status !== 'active') {
                console.log('❌ License inactive for auth token:', licenseKey.substring(0, 12) + '***', 'Status:', licenseData.status);
                throw new HttpsError(
                    'failed-precondition',
                    `License is ${licenseData.status}. Cannot generate auth token.`
                );
            }

            const uid = `license_${licenseData.id.replace('license_', '')}`;

            const customClaims: Record<string, string | boolean | number> = {
                licenseId: licenseData.id,
                tier: licenseData.tier,
                email: licenseData.email,
                features: licenseData.features,
                licenseStatus: licenseData.status
            };

            if (licenseData.tier === 'memory') {
                customClaims.memoryLimit = 'unlimited';
                customClaims.unlimitedProjects = true;
                customClaims.cloudSync = true;
                customClaims.apiPlatformSupport = true;
            } else {
                throw new HttpsError(
                    'failed-precondition',
                    'Invalid license tier. Only "memory" tier is currently supported.'
                );
            }

            const customToken = await admin.auth().createCustomToken(uid, customClaims);

            console.log('✅ Auth token generated successfully', {
                licenseId: licenseKey.substring(0, 12) + '***',
                email: licenseData.email.substring(0, 3) + '***',
                tier: licenseData.tier,
                uid: uid,
                timestamp: new Date().toISOString()
            });

            await admin.firestore()
                .collection('licenses')
                .doc(licenseKey)
                .update({
                    lastTokenGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                });

            return {
                customToken,
                uid,
                tier: licenseData.tier,
                features: licenseData.features
            };

        } catch (error) {
            console.error('❌ Error in getAuthToken:', error);
            
            if (error instanceof HttpsError) {
                throw error;
            }
            
            throw new HttpsError(
                'internal',
                'Auth token generation failed'
            );
        }
    }
);

/**
 * Report Usage Function (v2)
 */
export const reportUsage = onCall(async (data) => {
    try {
        if (!data || typeof data !== 'object') {
            throw new HttpsError(
                'invalid-argument',
                'Invalid request data'
            );
        }

        validateNoSecrets(data.data || {});

        const { operation, metadata, projectId, timestamp, version } = (data.data as unknown) as {
            operation: string;
            metadata: Record<string, unknown>;
            projectId: string;
            timestamp: string;
            version: string;
        };

        if (!operation || typeof operation !== 'string') {
            throw new HttpsError(
                'invalid-argument',
                'Operation is required and must be a string'
            );
        }

        if (!timestamp || typeof timestamp !== 'string') {
            throw new HttpsError(
                'invalid-argument',
                'Timestamp is required and must be a string'
            );
        }

        const usageRecord = {
            operation: operation.trim(),
            metadata: metadata || {},
            projectId: projectId || 'unknown',
            timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
            version: version || '1.0.0',
            reportedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await admin.firestore()
            .collection('usage')
            .add(usageRecord);

        console.log('✅ Usage reported successfully', {
            operation: operation.trim(),
            projectId: projectId || 'unknown',
            timestamp: timestamp
        });

        return {
            success: true,
            message: 'Usage reported successfully'
        };

    } catch (error) {
        console.error('❌ Error in reportUsage:', error);
        
        if (error instanceof HttpsError) {
            throw error;
        }
        
        throw new HttpsError(
            'internal',
            'Usage reporting failed'
        );
    }
});

/**
 * Validate Usage Function (v2) - Phase 2.2 Implementation
 * CRITICAL: Enforces usage limits with JWT verification
 */
export const validateUsage = onCall(
    async (request) => {
        try {
            // Verify Firebase ID Token (Authentication required)
            if (!request.auth || !request.auth.token) {
                console.log('❌ validateUsage: No auth token provided');
                throw new HttpsError(
                    'unauthenticated',
                    'Authentication required'
                );
            }

            if (!request.data || typeof request.data !== 'object') {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid request data'
                );
            }

            validateNoSecrets(request.data);

            const { licenseKey, operation, email } = (request.data as unknown) as {
                licenseKey: string;
                operation: string;
                email: string;
            };

            // Validate required fields
            if (!licenseKey || typeof licenseKey !== 'string') {
                throw new HttpsError(
                    'invalid-argument',
                    'License key is required'
                );
            }

            if (!operation || typeof operation !== 'string') {
                throw new HttpsError(
                    'invalid-argument',
                    'Operation is required'
                );
            }

            if (!email || typeof email !== 'string') {
                throw new HttpsError(
                    'invalid-argument',
                    'Email is required'
                );
            }

            // CRITICAL: Ensure authenticated user matches email in request
            const authEmail = request.auth.token.email;
            if (authEmail !== email) {
                console.log('❌ validateUsage: Email mismatch', {
                    authEmail: authEmail?.substring(0, 3) + '***',
                    requestEmail: email.substring(0, 3) + '***'
                });
                throw new HttpsError(
                    'permission-denied',
                    'Email does not match authenticated user'
                );
            }

            // Validate operation type
            const validOperations = ['recall', 'remember', 'scan', 'export', 'execute'];
            if (!validOperations.includes(operation)) {
                throw new HttpsError(
                    'invalid-argument',
                    `Invalid operation. Must be one of: ${validOperations.join(', ')}`
                );
            }

            // Get license document
            const licenseDoc = await admin.firestore()
                .collection('licenses')
                .doc(licenseKey)
                .get();

            if (!licenseDoc.exists) {
                console.log('❌ validateUsage: License not found:', licenseKey.substring(0, 12) + '***');
                throw new HttpsError(
                    'not-found',
                    'License not found'
                );
            }

            const licenseData = licenseDoc.data();
            if (!licenseData) {
                throw new HttpsError(
                    'internal',
                    'License data corrupted'
                );
            }

            // Check license active status
            if (licenseData.status !== 'active') {
                console.log('❌ validateUsage: License inactive:', licenseKey.substring(0, 12) + '***');
                throw new HttpsError(
                    'failed-precondition',
                    `License is ${licenseData.status}`
                );
            }

            // Verify license owner matches authenticated user
            if (licenseData.email !== email) {
                console.log('❌ validateUsage: License owner mismatch', {
                    licenseEmail: licenseData.email.substring(0, 3) + '***',
                    requestEmail: email.substring(0, 3) + '***'
                });
                throw new HttpsError(
                    'permission-denied',
                    'License does not belong to authenticated user'
                );
            }

            // Get current month key for usage tracking
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Initialize usage tracking if not exists
            if (!licenseData.usage) {
                await admin.firestore()
                    .collection('licenses')
                    .doc(licenseKey)
                    .update({
                        usage: {
                            [monthKey]: {
                                recall: 0,
                                remember: 0,
                                scan: 0,
                                export: 0,
                                execute: 0,
                                resetAt: admin.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    });
            }

            // Get current usage for this month
            const currentUsage = licenseData.usage?.[monthKey] || {
                recall: 0,
                remember: 0,
                scan: 0,
                export: 0,
                execute: 0
            };

            // Define operation limits based on tier
            let operationLimits: Record<string, number>;
            if (licenseData.tier === 'memory') {
                // Memory tier: UNLIMITED for all operations - more attractive offer!
                operationLimits = {
                    recall: 999999999,  // Effectively unlimited
                    remember: 999999999,
                    scan: 999999999,
                    export: 999999999,
                    execute: 999999999 // Unlimited execution when implemented
                };
            } else {
                // Free tier: 20/20/20 limits
                operationLimits = {
                    recall: 20,
                    remember: 20,
                    scan: 20,
                    export: 20,
                    execute: 20
                };
            }

            // Check if operation would exceed limit
            const currentCount = currentUsage[operation] || 0;
            const limit = operationLimits[operation];

            if (currentCount >= limit) {
                console.log('❌ validateUsage: Limit exceeded', {
                    licenseId: licenseKey.substring(0, 12) + '***',
                    operation,
                    currentCount,
                    limit,
                    tier: licenseData.tier
                });
                throw new HttpsError(
                    'resource-exhausted',
                    `Monthly ${operation} limit of ${limit} exceeded. Current usage: ${currentCount}/${limit}`
                );
            }

            // CRITICAL: Atomically increment usage before returning success
            const usageUpdatePath = `usage.${monthKey}.${operation}`;
            await admin.firestore()
                .collection('licenses')
                .doc(licenseKey)
                .update({
                    [usageUpdatePath]: admin.firestore.FieldValue.increment(1),
                    [`usage.${monthKey}.lastUsedAt`]: admin.firestore.FieldValue.serverTimestamp()
                });

            const newCount = currentCount + 1;

            console.log('✅ validateUsage: Operation authorized', {
                licenseId: licenseKey.substring(0, 12) + '***',
                email: email.substring(0, 3) + '***',
                operation,
                newCount,
                limit,
                tier: licenseData.tier,
                monthKey
            });

            return {
                success: true,
                operation,
                usage: {
                    current: newCount,
                    limit: licenseData.tier === 'memory' ? 'unlimited' : limit,
                    remaining: licenseData.tier === 'memory' ? 'unlimited' : (limit - newCount)
                },
                tier: licenseData.tier,
                monthKey
            };

        } catch (error) {
            console.error('❌ Error in validateUsage:', error);
            
            if (error instanceof HttpsError) {
                throw error;
            }
            
            throw new HttpsError(
                'internal',
                'Usage validation failed'
            );
        }
    }
);

/**
 * Get License by Session Function (v2)
 * Retrieves license key for success page display
 */
export const getLicenseBySession = onRequest(
    { secrets: [] },
    async (req: Request, res: Response) => {
        try {
            addSecurityHeaders(res);
            
            corsHandler(req, res, async () => {
                if (req.method !== 'GET') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return;
                }

                const sessionId = req.query.session_id as string;

                if (!sessionId || typeof sessionId !== 'string') {
                    res.status(400).json({ error: 'Session ID is required' });
                    return;
                }

                // Query licenses by Stripe session ID
                const licensesSnapshot = await admin.firestore()
                    .collection('licenses')
                    .where('stripeSessionId', '==', sessionId)
                    .limit(1)
                    .get();

                if (licensesSnapshot.empty) {
                    res.status(404).json({ error: 'License not found for session' });
                    return;
                }

                const licenseDoc = licensesSnapshot.docs[0];
                const licenseData = licenseDoc.data();

                // Return only the license key (not sensitive data)
                res.status(200).json({
                    licenseKey: licenseDoc.id,
                    tier: licenseData.tier,
                    email: licenseData.email.substring(0, 3) + '***' // Partially masked
                });
            });
        } catch (error) {
            console.error('❌ Error in getLicenseBySession:', error);
            res.status(500).json({ error: 'Failed to retrieve license' });
        }
    }
);

/**
 * Get Firebase Configuration for Customer CLI Distribution
 * CRITICAL: Solves the Firebase config distribution issue for customer environments
 *
 * This is a PUBLIC endpoint that serves Firebase client configuration.
 * Firebase client config is meant to be public (it's in every web app's source).
 * The API key restrictions in Google Cloud Console provide the actual security.
 */
export const getFirebaseConfig = onRequest(
    {
        cors: true, // Allow all origins for this public config endpoint
        memory: '128MiB',
        timeoutSeconds: 30,
        invoker: 'public', // CRITICAL: Allow public access without authentication
        secrets: [FIREBASE_WEB_API_KEY], // SECURITY: Load API key from Secret Manager
    },
    async (req: Request, res: Response) => {
        try {
            console.log('🔧 Firebase config requested by customer CLI');

            // Add security headers
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

            // Handle preflight OPTIONS request
            if (req.method === 'OPTIONS') {
                res.status(204).send('');
                return;
            }

            // Only allow GET requests
            if (req.method !== 'GET') {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }

            // Firebase client configuration (using Secret Manager for API key)
            // SECURITY: API key from Secret Manager, other config from environment/defaults
            const firebaseConfig = {
                apiKey: FIREBASE_WEB_API_KEY.value(), // SECURE: Read from Secret Manager
                authDomain: process.env.FIREBASE_AUTH_DOMAIN || "codecontextpro-mes.firebaseapp.com",
                projectId: process.env.FIREBASE_PROJECT_ID || "codecontextpro-mes",
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "codecontextpro-mes.firebasestorage.app",
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "168225201154",
                appId: process.env.FIREBASE_APP_ID || "1:168225201154:web:e035d44d4a093ddcf7db1b",
                databaseURL: process.env.FIREBASE_DATABASE_URL || "https://codecontextpro-mes-default-rtdb.firebaseio.com"
            };

            // Validate that we have the required configuration
            if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
                console.error('❌ Firebase configuration incomplete - missing API key or project ID');
                res.status(500).json({
                    error: 'Firebase configuration not properly set up on server',
                    message: 'Please contact support - server configuration issue'
                });
                return;
            }

            console.log('✅ Firebase config served to customer CLI');

            // Return the configuration
            res.status(200).json({
                ...firebaseConfig,
                version: "1.0.0",
                distributedAt: new Date().toISOString(),
                note: "This configuration enables your CLI to connect to CodeContextPro-MES services"
            });

        } catch (error) {
            console.error('❌ Error serving Firebase config:', error);
            res.status(500).json({
                error: 'Failed to retrieve Firebase configuration',
                message: 'Please try again or contact support'
            });
        }
    }
);
