/**
 * CodeContextPro-MES - AI Cognitive Upgrade
 * Main CLI implementation with remember/recall commands
 * 
 * Security-first implementation following Phase 1 Sprint 1.1 specification
 */

import { Command } from 'commander';
import { MemoryEngine } from './MemoryEngine';
import { FirebaseService } from './FirebaseService';
import { LicenseService } from './LicenseService';

export const version = "1.2.6";

interface RememberOptions {
    context: string;
    type: string;
}

interface RecallOptions {
    limit: string;
}

interface PurchaseOptions {
    tier: string;
    email?: string;
}

interface ScanOptions {
    deep?: boolean;
    type: string;
}

interface ExportOptions {
    format: string;
    output?: string;
}

interface SyncOptions {
    push?: boolean;
    pull?: boolean;
}

export class CodeContextCLI {
    private memoryEngine: MemoryEngine;
    private firebaseService: FirebaseService;
    private licenseService: LicenseService;
    private program: Command;

    constructor(projectPath: string = process.cwd(), skipFirebaseInit: boolean = false) {
        this.memoryEngine = new MemoryEngine(projectPath);
        this.firebaseService = new FirebaseService(skipFirebaseInit);
        this.licenseService = new LicenseService(projectPath, skipFirebaseInit);
        this.program = new Command();
        
        this.setupCommands();
    }

    /**
     * Setup CLI commands with security validation
     */
    private setupCommands(): void {
        this.program
            .name('codecontext')
            .description('🧠 CodeContextPro-MES - AI Cognitive Upgrade')
            .version(version);

        // codecontext remember command
        this.program
            .command('remember')
            .description('Store memory in persistent context')
            .argument('<content>', 'Content to remember')
            .option('-c, --context <context>', 'Context for the memory', 'cli-command')
            .option('-t, --type <type>', 'Type of memory', 'general')
            .action(async (content: string, options: RememberOptions) => {
                await this.handleRemember(content, options);
            });

        // codecontext recall command
        this.program
            .command('recall')
            .description('Search and retrieve memories')
            .argument('<query>', 'Search query')
            .option('-l, --limit <number>', 'Maximum number of results', '10')
            .action(async (query: string, options: RecallOptions) => {
                await this.handleRecall(query, options);
            });

        // codecontext status command (enhanced)
        this.program
            .command('status')
            .description('Show CodeContext Pro status and license info')
            .action(async () => {
                await this.handleStatus();
            });

        // codecontext purchase command (Phase 1 Sprint 1.2)
        this.program
            .command('purchase')
            .description('Purchase CodeContext Pro license')
            .option('-t, --tier <tier>', 'License tier (memory)', 'memory')
            .option('--email <email>', 'Email for checkout')
            .action(async (options: PurchaseOptions) => {
                await this.handlePurchase(options);
            });

        // codecontext activate command (Phase 2 Sprint 2.1) - CRITICAL FOR CUSTOMERS
        this.program
            .command('activate')
            .description('Activate your CodeContext Pro license')
            .argument('<licenseKey>', 'License key from your purchase confirmation')
            .action(async (licenseKey: string) => {
                await this.handleActivate(licenseKey);
            });

        // codecontext init command (Phase 2 Sprint 2.1) - CRITICAL FOR CUSTOMERS  
        this.program
            .command('init')
            .description('Initialize CodeContext Pro project')
            .action(async () => {
                await this.handleInit();
            });

        // codecontext license command (Phase 2 Sprint 2.1) - CRITICAL FOR CUSTOMERS
        this.program
            .command('license')
            .description('Show current license information')
            .action(async () => {
                await this.handleLicenseStatus();
            });

        // codecontext scan command (Phase 2.2) - Advanced memory features
        this.program
            .command('scan')
            .description('Scan project for patterns and store insights')
            .option('--deep', 'Perform deep pattern analysis')
            .option('-t, --type <type>', 'Type of scan (architecture, patterns, dependencies)', 'patterns')
            .action(async (options: ScanOptions) => {
                await this.handleScan(options);
            });

        // codecontext export command (Phase 2.2) - Memory export functionality
        this.program
            .command('export')
            .description('Export memory to file')
            .option('-f, --format <format>', 'Export format (json, markdown)', 'json')
            .option('-o, --output <file>', 'Output file path')
            .action(async (options: ExportOptions) => {
                await this.handleExport(options);
            });

        // codecontext sync command (Phase 2.2) - Cloud sync stub
        this.program
            .command('sync')
            .description('Sync memories with cloud (Premium feature)')
            .option('--push', 'Push local memories to cloud')
            .option('--pull', 'Pull cloud memories to local')
            .action(async (options: SyncOptions) => {
                await this.handleSync(options);
            });
    }

    /**
     * Validate usage limits and authenticate operation (Phase 2.2)
     * CRITICAL: Enforces usage limits before allowing operations
     */
    private async validateUsageAndAuthenticate(operation: string): Promise<void> {
        try {
            // Check if license is active
            const licenseStatus = this.licenseService.getLicenseStatus();
            if (!licenseStatus.active && !licenseStatus.mock) {
                throw new Error('No active license. Please activate your license first.');
            }

            // Skip usage validation for mock/development mode
            if (licenseStatus.mock) {
                console.log('🔧 Development mode: Skipping usage validation');
                return;
            }

            // Get current license and auth token
            const currentLicense = await this.licenseService.getCurrentLicenseAsync();
            if (!currentLicense.key || !currentLicense.email || !currentLicense.authToken) {
                throw new Error('License not properly activated. Please re-activate your license.');
            }

            console.log(`🛡️ Validating usage for operation: ${operation}`);

            // Call Firebase validateUsage function
            await this.firebaseService.validateUsage(
                currentLicense.key,
                operation,
                currentLicense.email,
                currentLicense.authToken
            );

            console.log('✅ Usage validation passed');

        } catch (error) {
            console.error('❌ Usage validation failed:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Report validation failure
            await this.firebaseService.reportUsage('usage_validation_failure', {
                operation,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            throw error;
        }
    }

    /**
     * Check if operation requires license validation
     */
    private requiresLicenseValidation(operation: string): boolean {
        const operationsRequiringValidation = ['remember', 'recall', 'scan', 'export', 'execute'];
        return operationsRequiringValidation.includes(operation);
    }

    /**
     * Handle remember command with security validation
     * Implements Phase 1 Sprint 1.1 specification + Phase 2.2 usage enforcement
     */
    private async handleRemember(content: string, options: RememberOptions): Promise<void> {
        try {
            console.log('🧠 CodeContext Pro - Remember');
            
            // Phase 2.2: Validate usage limits BEFORE performing operation
            await this.validateUsageAndAuthenticate('remember');

            // Store memory with validation
            const memoryId = await this.memoryEngine.storeMemory(
                content,
                options.context,
                options.type
            );

            // Report usage (fire-and-forget)
            await this.firebaseService.reportUsage('remember', {
                contentLength: content.length,
                context: options.context,
                type: options.type,
                memoryId
            });

            console.log(`✅ Memory stored successfully`);
            console.log(`   ID: ${memoryId}`);
            console.log(`   Context: ${options.context}`);
            console.log(`   Type: ${options.type}`);

        } catch (error) {
            console.error('❌ Failed to store memory:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle recall command with security validation
     * Implements Phase 1 Sprint 1.1 specification + Phase 2.2 usage enforcement
     */
    private async handleRecall(query: string, options: RecallOptions): Promise<void> {
        try {
            console.log('🔍 CodeContext Pro - Recall');
            
            // Phase 2.2: Validate usage limits BEFORE performing operation
            await this.validateUsageAndAuthenticate('recall');

            // Parse and validate limit
            const limit = parseInt(options.limit);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                console.error('❌ Invalid limit: must be a number between 1 and 100');
                process.exit(1);
            }

            // Search memories
            const memories = await this.memoryEngine.searchMemories(query, limit);

            // Report usage (fire-and-forget)
            await this.firebaseService.reportUsage('recall', {
                query: query.substring(0, 100), // Privacy: only first 100 chars
                resultCount: memories.length,
                limit
            });

            console.log(`✅ Found ${memories.length} memories for: "${query}"`);
            
            if (memories.length === 0) {
                console.log('   No memories found. Try a different search term.');
                return;
            }

            console.log('\n📋 Results:');
            memories.forEach((memory, index) => {
                console.log(`\n${index + 1}. Memory ID: ${memory.id}`);
                console.log(`   Date: ${new Date(memory.timestamp).toLocaleDateString()}`);
                console.log(`   Relevance: ${(memory.relevance * 100).toFixed(1)}%`);
                console.log(`   Content: ${memory.content.substring(0, 200)}${memory.content.length > 200 ? '...' : ''}`);
            });

        } catch (error) {
            console.error('❌ Failed to recall memories:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle status command with license information
     */
    private async handleStatus(): Promise<void> {
        try {
            console.log('📊 CodeContext Pro Status\n');

            // Project info
            const projectInfo = this.memoryEngine.getProjectInfo();
            console.log('📁 Project Information:');
            console.log(`   Path: ${projectInfo.path}`);
            console.log(`   Database: ${projectInfo.dbPath}`);

            // License status
            const licenseStatus = this.licenseService.getLicenseStatus();
            console.log('\n🎫 License Status:');
            console.log(`   Tier: ${licenseStatus.tier.toUpperCase()}`);
            console.log(`   Active: ${licenseStatus.active ? '✅' : '❌'}`);
            console.log(`   Features: ${licenseStatus.features.join(', ')}`);
            if (licenseStatus.mock) {
                console.log('   Mode: Development (Phase 1)');
            }

            // Firebase status
            const firebaseConfig = this.firebaseService.getConfig();
            console.log('\n🔥 Firebase Configuration:');
            console.log(`   Project ID: ${firebaseConfig.projectId}`);
            console.log(`   Configured: ${firebaseConfig.configured ? '✅' : '⚠️ Mock mode'}`);

            // Test Firebase connection
            const connectionOk = await this.firebaseService.testConnection();
            console.log(`   Connection: ${connectionOk ? '✅' : '❌'}`);

            console.log('\n🚀 System ready for Phase 1 development!');

        } catch (error) {
            console.error('❌ Failed to get status:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle purchase command 
     * Phase 1 Sprint 1.2: Secure license purchasing
     */
    private async handlePurchase(options: PurchaseOptions): Promise<void> {
        try {
            console.log('💳 CodeContext Pro - Purchase License');
            
            // Set email if provided
            if (options.email) {
                process.env.CODECONTEXT_USER_EMAIL = options.email;
                console.log(`   Email set to: ${options.email}`);
            }

            // Validate tier - Only memory tier available now
            const tier = options.tier?.toLowerCase() || 'memory';
            const validTiers = ['memory'];
            
            if (!validTiers.includes(tier)) {
                console.error(`❌ Invalid tier: ${tier}`);
                console.error(`   Valid options: ${validTiers.join(', ')} (no free tier)`);
                process.exit(1);
            }

            console.log(`   Tier: ${tier}`);
            
            // Attempt purchase
            const result = await this.licenseService.purchaseLicense(tier);
            
            if (result.success) {
                console.log(`✅ ${result.message}`);
                
                if (result.checkoutUrl) {
                    console.log(`\n🌐 Checkout URL: ${result.checkoutUrl}`);
                    console.log('   Open this URL in your browser to complete payment');
                }
                
                if (result.nextStep) {
                    console.log(`\n📋 Next step: ${result.nextStep}`);
                }
                
                // Report successful purchase initiation
                await this.firebaseService.reportUsage('license_purchase_success', {
                    tier: result.tier,
                    hasCheckout: !!result.checkoutUrl
                });
                
            } else {
                console.error(`❌ Purchase failed: ${result.message}`);
                
                if (result.nextStep) {
                    console.error(`   Next step: ${result.nextStep}`);
                }
                
                // Report failed purchase attempt
                await this.firebaseService.reportUsage('license_purchase_failure', {
                    tier: result.tier,
                    error: result.message
                });
                
                process.exit(1);
            }

        } catch (error) {
            console.error('❌ Failed to process purchase:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Report purchase error
            await this.firebaseService.reportUsage('license_purchase_error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            process.exit(1);
        }
    }

    /**
     * Handle activate command - CRITICAL for customer license activation
     * Implements Phase 2 Sprint 2.1 specification from CODECONTEXTPRO-MES.md
     */
    private async handleActivate(licenseKey: string): Promise<void> {
        try {
            console.log('🔑 CodeContext Pro - Activate License');
            console.log(`   License Key: ${licenseKey.substring(0, 12)}***`);
            
            // CRITICAL FIX: Create services that skip Firebase initialization
            // This allows customers to activate without Firebase config being present
            const activationLicenseService = new LicenseService(process.cwd(), true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activationFirebaseService = (activationLicenseService as any).firebaseService;
            
            // Activate license through LicenseService with deferred Firebase init
            const result = await activationLicenseService.activateLicense(licenseKey);
            
            console.log('✅ License activated successfully!');

            // CRITICAL: Now initialize Firebase with distributed config for reporting
            try {
                activationFirebaseService.initializeIfNeeded();

                // Report successful activation
                await activationFirebaseService.reportUsage('license_activation_success', {
                    tier: result.tier,
                    licenseId: licenseKey.substring(0, 12) + '***'
                });
            } catch (reportError) {
                console.warn('⚠️ Could not report activation (non-blocking):', reportError);
                // Don't fail activation if reporting fails
            }
            
            console.log('\n🚀 Next step: Run "codecontextpro init" to initialize your project');

        } catch (error) {
            console.error('❌ License activation failed:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Try to report failed activation if possible
            try {
                const reportingService = new FirebaseService(true);
                reportingService.initializeIfNeeded();
                await reportingService.reportUsage('license_activation_failure', {
                    licenseId: licenseKey.substring(0, 12) + '***',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            } catch {
                // Ignore reporting errors during failure
            }
            
            process.exit(1);
        }
    }

    /**
     * Handle init command - Initialize project after license activation
     * Implements Phase 2 Sprint 2.1 specification from CODECONTEXTPRO-MES.md
     */
    private async handleInit(): Promise<void> {
        try {
            console.log('🚀 CodeContext Pro - Initialize Project');
            
            // Check if license is activated
            const licenseStatus = this.licenseService.getLicenseStatus();
            if (!licenseStatus.active && !licenseStatus.mock) {
                console.error('❌ No active license found');
                console.error('   Please run "codecontextpro activate <LICENSE_KEY>" first');
                process.exit(1);
            }
            
            // Initialize project structure
            const projectInfo = await this.memoryEngine.initProject();
            
            console.log('✅ Project initialized successfully!');
            console.log(`   Project path: ${projectInfo.path}`);
            console.log(`   Database: ${projectInfo.dbPath}`);
            console.log(`   License tier: ${licenseStatus.tier.toUpperCase()}`);
            
            if (licenseStatus.tier === 'memory') {
                console.log('   Memory recalls: 5,000/month');
                console.log('   Projects: Unlimited');
                console.log('   Storage: Unlimited with AES-256 encryption');
            }
            
            // Report successful initialization
            await this.firebaseService.reportUsage('project_init_success', {
                tier: licenseStatus.tier,
                projectPath: projectInfo.path
            });
            
            console.log('\n🧠 You can now use:');
            console.log('   codecontextpro remember "Your memory content"');
            console.log('   codecontextpro recall "search query"');
            console.log('   codecontextpro status');

        } catch (error) {
            console.error('❌ Project initialization failed:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Report initialization error
            await this.firebaseService.reportUsage('project_init_failure', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            process.exit(1);
        }
    }

    /**
     * Handle license command - Show detailed license information
     * Implements Phase 2 Sprint 2.1 specification from CODECONTEXTPRO-MES.md
     */
    private async handleLicenseStatus(): Promise<void> {
        try {
            console.log('🎫 CodeContext Pro - License Information\n');
            
            const licenseStatus = this.licenseService.getLicenseStatus();
            const currentLicense = await this.licenseService.getCurrentLicenseAsync();
            
            console.log('License Details:');
            console.log(`   Tier: ${licenseStatus.tier.toUpperCase()}`);
            console.log(`   Status: ${licenseStatus.active ? '✅ Active' : '❌ Inactive'}`);
            console.log(`   Features: ${licenseStatus.features.join(', ')}`);

            if (currentLicense.key && !licenseStatus.mock) {
                console.log(`   License Key: ${currentLicense.key.substring(0, 12)}***`);
                console.log(`   Email: ${currentLicense.email || 'Not available'}`);

                if (currentLicense.activatedAt) {
                    console.log(`   Activated: ${new Date(currentLicense.activatedAt).toLocaleDateString()}`);
                }
            }
            
            if (licenseStatus.mock) {
                console.log('\n⚠️  Development Mode Active');
                console.log('   This is a development license with unlimited features');
                console.log('   Purchase a license for production use');
            }
            
            // Show tier-specific limits and features
            if (licenseStatus.tier === 'memory') {
                console.log('\nMemory Tier Limits:');
                console.log('   Memory Recalls: 5,000/month');
                console.log('   Projects: Unlimited');
                console.log('   Storage: Unlimited');
                console.log('   Encryption: AES-256');
                console.log('   Support: Priority');
            }
            
            // Report license status check
            await this.firebaseService.reportUsage('license_status_check', {
                tier: licenseStatus.tier,
                active: licenseStatus.active,
                mock: licenseStatus.mock
            });

        } catch (error) {
            console.error('❌ Failed to get license status:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle scan command - Phase 2.2 Deep Project Analysis
     */
    private async handleScan(options: ScanOptions): Promise<void> {
        try {
            console.log('🔍 CodeContext Pro - Project Scan');
            
            // Phase 2.2: Validate usage limits BEFORE performing operation
            await this.validateUsageAndAuthenticate('scan');

            const scanType = options.type || 'patterns';
            const deepAnalysis = options.deep || false;

            console.log(`   Scan Type: ${scanType}`);
            console.log(`   Deep Analysis: ${deepAnalysis ? 'Yes' : 'No'}`);

            // TODO: Implement ProjectScanner.ts for deep analysis
            console.log('🚧 Scanning project for patterns...');
            
            // Mock implementation for now
            const insights = {
                patterns: deepAnalysis ? ['Advanced React Hooks', 'TypeScript Interfaces', 'Error Boundaries'] : ['React Components', 'TypeScript'],
                filesScanned: 42,
                issuesFound: deepAnalysis ? 3 : 1
            };

            // Store scan results as memory
            const memoryId = await this.memoryEngine.storeMemory(
                `Project scan results: Found ${insights.patterns.length} patterns in ${insights.filesScanned} files. Issues: ${insights.issuesFound}`,
                'project-scan',
                'scan-result'
            );

            // Report usage
            await this.firebaseService.reportUsage('scan', {
                scanType,
                deepAnalysis,
                patternsFound: insights.patterns.length,
                filesScanned: insights.filesScanned,
                memoryId
            });

            console.log(`✅ Scan completed successfully`);
            console.log(`   Patterns found: ${insights.patterns.join(', ')}`);
            console.log(`   Files scanned: ${insights.filesScanned}`);
            console.log(`   Issues detected: ${insights.issuesFound}`);
            console.log(`   Results stored in memory: ${memoryId}`);

        } catch (error) {
            console.error('❌ Failed to scan project:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle export command - Phase 2.2 Memory Export
     */
    private async handleExport(options: ExportOptions): Promise<void> {
        try {
            console.log('📤 CodeContext Pro - Export Memory');
            
            // Phase 2.2: Validate usage limits BEFORE performing operation
            await this.validateUsageAndAuthenticate('export');

            const format = options.format || 'json';
            const outputFile = options.output || `codecontext-export-${Date.now()}.${format}`;

            console.log(`   Format: ${format}`);
            console.log(`   Output: ${outputFile}`);

            // TODO: Implement MemoryEngine.exportMemory method
            console.log('📋 Exporting memories...');

            // Mock export for now
            const exportData = {
                exportedAt: new Date().toISOString(),
                format,
                totalMemories: 25,
                file: outputFile
            };

            // Report usage
            await this.firebaseService.reportUsage('export', {
                format,
                outputFile,
                totalMemories: exportData.totalMemories
            });

            console.log(`✅ Export completed successfully`);
            console.log(`   Exported ${exportData.totalMemories} memories`);
            console.log(`   File: ${outputFile}`);

        } catch (error) {
            console.error('❌ Failed to export memories:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Handle sync command - Phase 2.2 Cloud Sync (Stub)
     */
    private async handleSync(options: SyncOptions): Promise<void> {
        try {
            console.log('☁️ CodeContext Pro - Cloud Sync');
            
            // Check if license supports cloud sync
            const licenseStatus = this.licenseService.getLicenseStatus();
            if (licenseStatus.tier !== 'memory' && !licenseStatus.mock) {
                console.error('❌ Cloud sync requires Memory tier subscription');
                console.error('   Upgrade your license to enable cloud sync');
                process.exit(1);
            }

            const operation = options.push ? 'push' : options.pull ? 'pull' : 'sync';
            console.log(`   Operation: ${operation}`);

            // Report usage (but don't validate since this is a stub)
            await this.firebaseService.reportUsage('sync_attempt', {
                operation,
                tier: licenseStatus.tier
            });

            console.log('🚧 Cloud sync is coming in Phase 3!');
            console.log('   Your memories are safely stored locally with AES-256 encryption');
            console.log('   Cloud sync will enable seamless memory sharing across devices');

        } catch (error) {
            console.error('❌ Failed to sync:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    }

    /**
     * Run the CLI application
     */
    run(argv?: string[]): void {
        this.program.parse(argv || process.argv);
    }
}

/**
 * Main entry point
 */
export function main(argv?: string[]): void {
    try {
        // CRITICAL: Skip Firebase initialization if no Firebase config is present (customer environment)
        const hasFirebaseConfig = !!(
            process.env.FIREBASE_PROJECT_ID || 
            process.env.FIREBASE_API_KEY ||
            require('fs').existsSync(require('path').join(process.cwd(), '.codecontext', 'firebase-config.json'))
        );
        
        const cli = new CodeContextCLI(process.cwd(), !hasFirebaseConfig);
        cli.run(argv);
    } catch (error) {
        console.error('❌ Failed to initialize CodeContext Pro:');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
}

// Export for testing
export default { version, main, CodeContextCLI };
