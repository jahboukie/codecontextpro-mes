/**
 * CodeContextPro-MES - AI Cognitive Upgrade
 * Main CLI implementation with remember/recall commands
 * 
 * Security-first implementation following Phase 1 Sprint 1.1 specification
 */

import { Command } from 'commander';
import { MemoryEngine } from './MemoryEngine';

export const version = "1.3.1";

interface RememberOptions {
    context: string;
    type: string;
}

interface RecallOptions {
    limit: string;
}







export class CodeContextCLI {
    private memoryEngine: MemoryEngine;
    private program: Command;

    constructor(projectPath: string = process.cwd()) {
        this.memoryEngine = new MemoryEngine(projectPath);
        this.program = new Command();
        
        this.setupCommands();
    }

    /**
     * Setup CLI commands with security validation
     */
    private setupCommands(): void {
        this.program
            .name('ccpro')
            .description('🧠 CodeContextPro - AI Cognitive Upgrade')
            .version(version);

        // ccpro remember command
        this.program
            .command('remember')
            .description('Store memory in persistent context')
            .argument('<content>', 'Content to remember')
            .option('-c, --context <context>', 'Context for the memory', 'cli-command')
            .option('-t, --type <type>', 'Type of memory', 'general')
            .action(async (content: string, options: RememberOptions) => {
                await this.handleRemember(content, options);
            });

        // ccpro recall command
        this.program
            .command('recall')
            .description('Search and retrieve memories')
            .argument('<query>', 'Search query')
            .option('-l, --limit <number>', 'Maximum number of results', '10')
            .action(async (query: string, options: RecallOptions) => {
                await this.handleRecall(query, options);
            });

        // ccpro status command (enhanced)
        this.program
            .command('status')
            .description('Show CodeContext Pro status and license info')
            .action(async () => {
                await this.handleStatus();
            });










    }



    /**
     * Handle remember command with security validation
     * Implements Phase 1 Sprint 1.1 specification + Phase 2.2 usage enforcement
     */
    private async handleRemember(content: string, options: RememberOptions): Promise<void> {
        try {
            console.log('🧠 CodeContext Pro - Remember');

            // Store memory with validation
            const memoryId = await this.memoryEngine.storeMemory(
                content,
                options.context,
                options.type
            );

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

            // Parse and validate limit
            const limit = parseInt(options.limit);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                console.error('❌ Invalid limit: must be a number between 1 and 100');
                process.exit(1);
            }

            // Search memories
            const memories = await this.memoryEngine.searchMemories(query, limit);

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

            // Memory statistics
            const stats = await this.memoryEngine.getStats();
            console.log('\n🧠 Memory Statistics:');
            console.log(`   Total Memories: ${stats.totalMemories}`);
            console.log(`   Database Size: ${(stats.totalSizeBytes / 1024).toFixed(1)} KB`);
            console.log(`   Last Updated: ${stats.lastUpdated}`);

            console.log('\n🚀 System ready!');

        } catch (error) {
            console.error('❌ Failed to get status:');
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
        const cli = new CodeContextCLI(process.cwd());
        cli.run(argv);
    } catch (error) {
        console.error('❌ Failed to initialize CodeContext Pro:');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
}

// Export for testing
export default { version, main, CodeContextCLI };
