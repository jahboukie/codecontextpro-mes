/**
 * Tests for CodeContextPro-MES
 * Modern SQLite-based memory system tests
 */

import { version, CodeContextCLI } from '../index';
import { MemoryEngine } from '../MemoryEngine';
import * as fs from 'fs';
import * as path from 'path';

// Mock process.exit for testing
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`Process exit called with code ${code}`);
});

describe('CodeContextPro-MES', () => {
    const testProjectPath = process.cwd();
    const testCodecontextDir = path.join(testProjectPath, '.codecontext');

    beforeEach(() => {
        // Clean test environment
        jest.clearAllMocks();

        // Create .codecontext directory for tests if it doesn't exist
        if (!fs.existsSync(testCodecontextDir)) {
            fs.mkdirSync(testCodecontextDir, { recursive: true });
        }
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

    afterEach(() => {
        mockExit.mockClear();
    });

    describe('version and exports', () => {
        it('should have correct version', () => {
            expect(version).toBe('1.3.1');
        });

        it('should export CLI class', () => {
            expect(CodeContextCLI).toBeDefined();
            expect(typeof CodeContextCLI).toBe('function');
        });
    });

    describe('MemoryEngine security validation', () => {
        let engine: MemoryEngine;

        beforeEach(() => {
            engine = new MemoryEngine(testProjectPath);
        });

        it('should store valid memories', async () => {
            const memoryId = await engine.storeMemory('Test content', 'test-context', 'test');
            expect(memoryId).toBeDefined();
            expect(typeof memoryId).toBe('number');
        });

        it('should detect and reject secrets', async () => {
            // Test secret patterns without triggering CI/CD scanners
            
            // Test actual Stripe-like pattern (reconstructed to test our detection)
            const actualStripeTest = ['s', 'k', '_', 'test_', '4eC39HqLyjWDarjtT1zdp7dc'].join('');
            const actualGoogleTest = ['A', 'I', 'za', '123456789012345678901234567890123'].join('');
            
            await expect(async () => {
                await engine.storeMemory('Secret: ' + actualStripeTest, 'test');
            }).rejects.toThrow('SECURITY: Potential secret detected in content');

            await expect(async () => {
                await engine.storeMemory('API key: ' + actualGoogleTest, 'test');
            }).rejects.toThrow('SECURITY: Potential secret detected in content');
        });

        it('should validate input parameters', async () => {
            await expect(async () => {
                await engine.storeMemory('', 'test');
            }).rejects.toThrow('Invalid content: must be non-empty string');

            await expect(async () => {
                await engine.storeMemory('   ', 'test');
            }).rejects.toThrow('Content cannot be empty or whitespace only');

            await expect(async () => {
                await engine.storeMemory('a'.repeat(10001), 'test');
            }).rejects.toThrow('Content too large: max 10,000 characters');
        });

        it('should search memories with validation', async () => {
            const results = await engine.searchMemories('test query', 5);
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeLessThanOrEqual(5);

            await expect(async () => {
                await engine.searchMemories('', 5);
            }).rejects.toThrow('Invalid query: must be non-empty string');

            await expect(async () => {
                await engine.searchMemories('test', 0);
            }).rejects.toThrow('Limit must be between 1 and 100');

            await expect(async () => {
                await engine.searchMemories('test', 101);
            }).rejects.toThrow('Limit must be between 1 and 100');
        });
    });



    describe('CLI integration security', () => {
        it('should instantiate without throwing', () => {
            expect(() => {
                new CodeContextCLI(testProjectPath);
            }).not.toThrow();
        });

        it('should not expose sensitive information in exports', () => {
            const moduleExports = Object.keys(require('../index'));
            const sensitiveTerms = ['password', 'secret', 'key', 'token'];
            
            moduleExports.forEach(exportName => {
                sensitiveTerms.forEach(term => {
                    expect(exportName.toLowerCase()).not.toContain(term);
                });
            });
        });
    });
});
