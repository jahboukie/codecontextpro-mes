#!/usr/bin/env node

/**
 * CodeContextPro-MES CLI - API Mode
 * Uses HTTP API calls instead of direct database access
 * This demonstrates the migration to the new architecture
 */

import { Command } from 'commander';
import { ApiClient } from './ApiClient';

interface RememberOptions {
    context?: string;
    type?: string;
}

interface RecallOptions {
    limit?: string;
}

export class CodeContextCLI_API {
    private program: Command;
    private apiClient: ApiClient;

    constructor() {
        this.program = new Command();
        this.apiClient = new ApiClient('http://localhost:3000');
        this.setupCommands();
    }

    private setupCommands(): void {
        this.program
            .name('ccpro-api')
            .description('🧠 CodeContextPro-MES - API Mode (Migration Demo)')
            .version('2.0.0');

        // ccpro-api remember command
        this.program
            .command('remember <content>')
            .description('Store memory via API')
            .option('-c, --context <context>', 'Memory context', 'cli-api')
            .option('-t, --type <type>', 'Memory type', 'general')
            .action(async (content: string, options: RememberOptions) => {
                await this.handleRemember(content, options);
            });

        // ccpro-api recall command
        this.program
            .command('recall <query>')
            .description('Search memories via API')
            .option('-l, --limit <limit>', 'Maximum results', '10')
            .action(async (query: string, options: RecallOptions) => {
                await this.handleRecall(query, options);
            });

        // ccpro-api status command
        this.program
            .command('status')
            .description('Show system status via API')
            .action(async () => {
                await this.handleStatus();
            });

        // ccpro-api health command
        this.program
            .command('health')
            .description('Check API health')
            .action(async () => {
                await this.handleHealth();
            });
    }

    private async handleRemember(content: string, options: RememberOptions): Promise<void> {
        try {
            console.log('🧠 CodeContextPro-MES - Remember (API Mode)');
            console.log('🌐 Using HTTP API instead of direct database access');
            
            const result = await this.apiClient.remember(
                content,
                options.context,
                options.type
            );

            console.log('✅ Memory stored successfully via API');
            console.log(`   Memory ID: ${result.memoryId}`);
            console.log(`   Context: ${options.context || 'cli-api'}`);
            console.log(`   Type: ${options.type || 'general'}`);

        } catch (error) {
            console.error('❌ Failed to store memory via API:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('💡 Make sure the Next.js API server is running on http://localhost:3000');
            process.exit(1);
        }
    }

    private async handleRecall(query: string, options: RecallOptions): Promise<void> {
        try {
            console.log('🔍 CodeContextPro-MES - Recall (API Mode)');
            console.log('🌐 Using HTTP API instead of direct database access');
            
            const limit = parseInt(options.limit || '10');
            const memories = await this.apiClient.recall(query, limit);

            console.log(`✅ Found ${memories.length} memories via API for: "${query}"`);
            console.log('');

            if (memories.length === 0) {
                console.log('📭 No memories found matching your query');
                return;
            }

            console.log('📋 Results:');
            console.log('');

            memories.forEach((memory, index) => {
                console.log(`${index + 1}. Memory ID: ${memory.id}`);
                console.log(`   Date: ${new Date(memory.timestamp).toLocaleDateString()}`);
                console.log(`   Relevance: ${memory.relevance}%`);
                console.log(`   Content: ${memory.content}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Failed to recall memories via API:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('💡 Make sure the Next.js API server is running on http://localhost:3000');
            process.exit(1);
        }
    }

    private async handleStatus(): Promise<void> {
        try {
            console.log('📊 CodeContextPro-MES Status (API Mode)');
            console.log('🌐 Using HTTP API instead of direct database access');
            console.log('');

            const status = await this.apiClient.status();

            console.log('📁 Project Information:');
            console.log(`   Path: ${status.project.path}`);
            console.log(`   Database: ${status.project.dbPath}`);
            console.log('');

            console.log('🧠 Memory Statistics:');
            console.log(`   Total Memories: ${status.memory.totalMemories}`);
            console.log(`   Database Size: ${status.memory.totalSizeKB} KB`);
            console.log(`   Last Updated: ${status.memory.lastUpdated}`);
            console.log('');

            console.log('🚀 System Information:');
            console.log(`   Status: ${status.system.ready ? 'Ready' : 'Not Ready'}`);
            console.log(`   Version: ${status.system.version}`);
            console.log(`   Engine: ${status.system.engine}`);
            console.log(`   Mode: API (HTTP)`);

        } catch (error) {
            console.error('❌ Failed to get status via API:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('💡 Make sure the Next.js API server is running on http://localhost:3000');
            process.exit(1);
        }
    }

    private async handleHealth(): Promise<void> {
        try {
            console.log('🏥 CodeContextPro-MES Health Check (API Mode)');
            
            const isHealthy = await this.apiClient.healthCheck();

            if (isHealthy) {
                console.log('✅ API server is healthy and responding');
                console.log('🌐 http://localhost:3000 is accessible');
            } else {
                console.log('❌ API server is not responding');
                console.log('💡 Start the Next.js server with: npm run dev');
                process.exit(1);
            }

        } catch (error) {
            console.error('❌ Health check failed:');
            console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('💡 Make sure the Next.js API server is running on http://localhost:3000');
            process.exit(1);
        }
    }

    run(): void {
        this.program.parse();
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    const cli = new CodeContextCLI_API();
    cli.run();
}
