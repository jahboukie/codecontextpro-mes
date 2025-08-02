/**
 * Tests for LicenseService Phase 1 Sprint 1.2
 * Security-first testing for license purchasing and validation
 */

import { LicenseService } from '../LicenseService';
import { FirebaseService } from '../FirebaseService';
import * as fs from 'fs';
import * as path from 'path';

// Mock FirebaseService to avoid real Firebase calls during tests
jest.mock('../FirebaseService');

// Mock process.exit for testing
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`Process exit called with code ${code}`);
});

describe('LicenseService Phase 1 Sprint 1.2', () => {
    const testProjectPath = process.cwd();
    const testCodecontextDir = path.join(testProjectPath, '.codecontext');
    let service: LicenseService;

    beforeEach(() => {
        // Enable development mode for license tests
        process.env.CODECONTEXT_DEV_MODE = 'true';
        process.env.NODE_ENV = 'development';
        
        // Set complete Firebase test environment
        process.env.FIREBASE_PROJECT_ID = 'test-project';
        process.env.FIREBASE_API_KEY = 'test-api-key';
        process.env.FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
        process.env.FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
        process.env.FIREBASE_MESSAGING_SENDER_ID = '123456789';
        process.env.FIREBASE_APP_ID = '1:123456789:web:abcdef123456';
        jest.clearAllMocks();

        // Setup FirebaseService mock implementations
        const MockedFirebaseServiceClass = FirebaseService as jest.MockedClass<typeof FirebaseService>;
        const mockFirebaseService = MockedFirebaseServiceClass.prototype;
        
        // Default successful validation for most tests - matches production Firebase response
        mockFirebaseService.validateLicense = jest.fn().mockResolvedValue({
            licenseId: 'license_1642764800000_abc123def',
            tier: 'memory',
            status: 'active',
            features: ['memory_recalls_5000', 'unlimited_projects', 'persistent_memory', 'cloud_sync'],
            activatedAt: new Date().toISOString(),
            email: 'test@example.com',
            apiKey: 'mock_user_encryption_key',
            createdAt: new Date().toISOString()
        });

        mockFirebaseService.reportUsage = jest.fn().mockResolvedValue(true);
        mockFirebaseService.getConfig = jest.fn().mockReturnValue({
            projectId: 'test-project',
            apiEndpoint: 'mock-endpoint',
            configured: true
        });
        mockFirebaseService.testConnection = jest.fn().mockResolvedValue(true);
        mockFirebaseService.getAuthToken = jest.fn().mockResolvedValue({
            customToken: 'mock_custom_token',
            uid: 'mock_uid',
            tier: 'memory',
            features: ['memory_recalls_5000', 'unlimited_projects']
        });

        // Create .codecontext directory for tests if it doesn't exist
        if (!fs.existsSync(testCodecontextDir)) {
            fs.mkdirSync(testCodecontextDir, { recursive: true });
        }

        service = new LicenseService(testProjectPath);
    });

    afterAll(() => {
        // Clean up test directory if we created it
        if (fs.existsSync(testCodecontextDir)) {
            try {
                fs.rmSync(testCodecontextDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors in CI/CD
                console.warn('Test cleanup warning:', error);
            }
        }
    });

    afterEach(async () => {
        // Clean up development mode environment variables
        delete process.env.CODECONTEXT_DEV_MODE;
        delete process.env.NODE_ENV;
        // Wait for file locks to release
        await new Promise(resolve => setTimeout(resolve, 50));
        
        mockExit.mockClear();
        // Clean up environment variables
        delete process.env.CODECONTEXT_USER_EMAIL;
    });

    describe('License purchasing with Firebase integration', () => {
        it('should reject free tier for security (no free tier allowed)', async () => {
            const result = await service.purchaseLicense('free');
            
            expect(result.success).toBe(false); // Security: No free tier
            expect(result.message).toContain('Invalid tier: free');
            expect(result.message).toContain('Valid options: memory (no free tier)');
        });

        it('should require email for paid tiers', async () => {
            const result = await service.purchaseLicense('memory');
            
            expect(result.success).toBe(false);
            expect(result.tier).toBe('memory');
            expect(result.message).toContain('Email required for checkout');
            expect(result.nextStep).toContain('Set email first');
        });

        it('should generate checkout URL for memory tier with email', async () => {
            process.env.CODECONTEXT_USER_EMAIL = 'test@example.com';
            
            const result = await service.purchaseLicense('memory');
            
            expect(result.success).toBe(true);
            expect(result.tier).toBe('memory');
            expect(result.message).toContain('checkout ready');
            expect(result.checkoutUrl).toContain('codecontextpro-mes.web.app');
            expect(result.checkoutUrl).toContain('tier=memory');
            expect(result.checkoutUrl).toContain('email=test%40example.com');
        });

        it('should validate tier input', async () => {
            await expect(service.purchaseLicense('invalid-tier')).resolves.toMatchObject({
                success: false,
                message: expect.stringContaining('Invalid tier')
            });

            await expect(service.purchaseLicense('')).resolves.toMatchObject({
                success: false,
                message: expect.stringContaining('Tier is required')
            });
        });

        it('should handle errors gracefully', async () => {
            process.env.CODECONTEXT_USER_EMAIL = 'test@example.com';
            
            // Mock Firebase service to throw error
            const originalReportUsage = service['firebaseService']['reportUsage'];
            service['firebaseService']['reportUsage'] = jest.fn().mockRejectedValue(new Error('Network error'));
            
            const result = await service.purchaseLicense('memory');
            
            // Should still succeed despite Firebase error (fire-and-forget)
            expect(result.success).toBe(true);
            expect(result.tier).toBe('memory');
            
            // Restore original method
            service['firebaseService']['reportUsage'] = originalReportUsage;
        });
    });

    describe('License activation with security validation', () => {
        it('should validate license key format', async () => {
            await expect(service.activateLicense('')).rejects.toThrow(
                'License key is required'
            );

            await expect(service.activateLicense('short')).rejects.toThrow(
                'Invalid license key format. Expected format: license_TIMESTAMP_RANDOMID'
            );

            await expect(service.activateLicense('invalid@chars!')).rejects.toThrow(
                'Invalid license key format. Expected format: license_TIMESTAMP_RANDOMID'
            );
        });

        it('should activate valid license keys', async () => {
            const validKey = `license_${Date.now()}_abcdef123`;
            
            // Mock the storeLicenseSecurely and distributeFirebaseConfig methods to avoid crypto/filesystem issues in tests
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'storeLicenseSecurely').mockResolvedValue(undefined);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            jest.spyOn(service as any, 'distributeFirebaseConfig').mockResolvedValue(undefined);
            
            // The mock in beforeEach should return a successful validation
            const result = await service.activateLicense(validKey);
            
            expect(result.active).toBe(true);
            expect(result.tier).toBe('memory');
            expect(result.key).toBe(validKey);
        });
    });

    describe('License validation and feature checking', () => {
        it('should provide developer license by default', () => {
            const license = service.getCurrentLicense();
            
            expect(license.tier).toBe('developer');
            expect(license.active).toBe(true);
            expect(license.features).toContain('unlimited_memory');
            expect(license.features).toContain('unlimited_execution');
            expect(license.features).toContain('debug_mode');
            expect(license.mock).toBe(true);
        });

        it('should validate feature permissions', () => {
            expect(service.hasFeature('unlimited_memory')).toBe(true);
            expect(service.hasFeature('unlimited_execution')).toBe(true);
            expect(service.hasFeature('debug_mode')).toBe(true);
            expect(service.hasFeature('nonexistent_feature')).toBe(false);
        });

        it('should allow operations in development mode', () => {
            expect(service.canPerformOperation('remember')).toBe(true);
            expect(service.canPerformOperation('recall')).toBe(true);
            expect(service.canPerformOperation('execute')).toBe(true);
            expect(service.canPerformOperation('sync')).toBe(true);
        });

        it('should validate operation input', () => {
            expect(service.canPerformOperation('')).toBe(false);
            expect(service.canPerformOperation(null as unknown as string)).toBe(false);
            expect(service.canPerformOperation(undefined as unknown as string)).toBe(false);
        });

        it('should provide license status summary', () => {
            const status = service.getLicenseStatus();
            
            expect(status.tier).toBe('developer');
            expect(status.active).toBe(true);
            expect(status.features).toContain('unlimited_memory');
            expect(status.mock).toBe(true);
        });
    });

    describe('Security validations', () => {
        it('should validate input parameters for all methods', async () => {
            // Test null/undefined inputs
            await expect(service.purchaseLicense(null as unknown as string)).resolves.toMatchObject({
                success: false,
                message: expect.stringContaining('Tier is required')
            });

            await expect(service.activateLicense(null as unknown as string)).rejects.toThrow(
                'License key is required'
            );

            expect(service.hasFeature(null as unknown as string)).toBe(false);
            expect(service.canPerformOperation(null as unknown as string)).toBe(false);
        });

        it('should handle whitespace-only inputs', async () => {
            await expect(service.activateLicense('   ')).rejects.toThrow(
                'Invalid license key format'
            );
        });

        it('should not expose sensitive information', () => {
            const license = service.getCurrentLicense();
            const status = service.getLicenseStatus();
            
            // Should not contain sensitive patterns
            const sensitivePatterns = [
                /sk_[a-zA-Z0-9_]{20,}/,  // Stripe secret keys
                /AIza[0-9A-Za-z\-_]{35}/, // Google API keys
                /password/i,
                /secret/i
            ];
            
            const licenseStr = JSON.stringify(license);
            const statusStr = JSON.stringify(status);
            
            sensitivePatterns.forEach(pattern => {
                expect(licenseStr).not.toMatch(pattern);
                expect(statusStr).not.toMatch(pattern);
            });
        });
    });

    describe('Integration with Firebase reporting', () => {
        it('should report usage events during purchase', async () => {
            process.env.CODECONTEXT_USER_EMAIL = 'test@example.com';
            
            const reportUsageSpy = jest.spyOn(service['firebaseService'], 'reportUsage');
            
            await service.purchaseLicense('memory');
            
            expect(reportUsageSpy).toHaveBeenCalledWith(
                'license_purchase_attempt',
                expect.objectContaining({
                    tier: 'memory',
                    email: 'tes***' // Privacy: partial email
                })
            );
        });

        it('should sanitize email in reporting', async () => {
            process.env.CODECONTEXT_USER_EMAIL = 'very-long-email-address@example.com';
            
            const reportUsageSpy = jest.spyOn(service['firebaseService'], 'reportUsage');
            
            await service.purchaseLicense('memory');
            
            expect(reportUsageSpy).toHaveBeenCalledWith(
                'license_purchase_attempt',
                expect.objectContaining({
                    tier: 'memory',
                    email: 'ver***' // Only first 3 characters
                })
            );
        });
    });
});