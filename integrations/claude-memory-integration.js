/**
 * Claude (Anthropic) Integration with CodeContextPro Memory
 * This shows how to give Claude persistent memory using our API
 */

import Anthropic from '@anthropic-ai/sdk';

class ClaudeWithMemory {
    constructor(apiKey, memoryApiUrl = 'http://localhost:3000') {
        this.anthropic = new Anthropic({ apiKey });
        this.memoryApi = memoryApiUrl;
    }

    // Store information in persistent memory
    async storeMemory(content, context = 'claude-session') {
        try {
            const response = await fetch(`${this.memoryApi}/api/memory/remember`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, context, type: 'conversation' })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to store memory:', error);
            return null;
        }
    }

    // Recall relevant memories
    async recallMemory(query, limit = 5) {
        try {
            const response = await fetch(
                `${this.memoryApi}/api/memory/recall?query=${encodeURIComponent(query)}&limit=${limit}`
            );
            const result = await response.json();
            return result.memories || [];
        } catch (error) {
            console.error('Failed to recall memory:', error);
            return [];
        }
    }

    // Enhanced chat with memory integration
    async chatWithMemory(userMessage, systemContext = '') {
        try {
            // 1. Search for relevant memories
            const relevantMemories = await this.recallMemory(userMessage);
            
            // 2. Build context from memories
            let memoryContext = '';
            if (relevantMemories.length > 0) {
                memoryContext = '\n\n<relevant_memories>\n';
                relevantMemories.forEach((memory, index) => {
                    memoryContext += `Memory ${index + 1}: ${memory.content} (Context: ${memory.context}, Date: ${memory.timestamp})\n`;
                });
                memoryContext += '</relevant_memories>\n';
            }

            // 3. Create enhanced system prompt
            const enhancedSystemPrompt = `${systemContext}

You have access to persistent memory from previous conversations. Use the memories below to provide personalized, contextual responses.
${memoryContext}

Instructions:
- Reference relevant memories when appropriate
- If you learn something important about the user, mention that you'll remember it
- Provide personalized responses based on past interactions
- Be natural about incorporating memory - don't just list what you remember`;

            // 4. Get Claude response
            const response = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                system: enhancedSystemPrompt,
                messages: [
                    { role: "user", content: userMessage }
                ]
            });

            const claudeResponse = response.content[0].text;

            // 5. Auto-extract and store important information
            await this.autoStoreImportantInfo(userMessage, claudeResponse);

            return claudeResponse;

        } catch (error) {
            console.error('Chat with memory failed:', error);
            return 'Sorry, I encountered an error while processing your request.';
        }
    }

    // Automatically extract and store important information
    async autoStoreImportantInfo(userMessage, claudeResponse) {
        try {
            // Use Claude to identify what should be remembered
            const extractionPrompt = `Analyze this conversation and identify any important information that should be remembered for future interactions.

User message: "${userMessage}"
Assistant response: "${claudeResponse}"

Extract any:
- User preferences or requirements
- Project details or technical specifications  
- Personal information or context
- Important decisions or conclusions
- Recurring themes or patterns

Return ONLY a JSON array of objects with "content" and "context" fields for information worth remembering. If nothing important, return empty array.

Example: [{"content": "User prefers TypeScript over JavaScript", "context": "coding-preferences"}]`;

            const extractionResponse = await this.anthropic.messages.create({
                model: "claude-3-haiku-20240307", // Use faster model for extraction
                max_tokens: 500,
                messages: [
                    { role: "user", content: extractionPrompt }
                ]
            });

            const extractionText = extractionResponse.content[0].text.trim();
            
            // Try to parse JSON response
            try {
                const memoriesToStore = JSON.parse(extractionText);
                if (Array.isArray(memoriesToStore)) {
                    for (const memory of memoriesToStore) {
                        if (memory.content && memory.context) {
                            await this.storeMemory(memory.content, memory.context);
                        }
                    }
                }
            } catch (parseError) {
                // If JSON parsing fails, store the raw extraction if it looks important
                if (extractionText.length > 10 && !extractionText.includes('nothing important')) {
                    await this.storeMemory(extractionText, 'auto-extracted');
                }
            }

        } catch (error) {
            console.error('Auto-storage failed:', error);
        }
    }

    // Get memory statistics
    async getMemoryStats() {
        try {
            const response = await fetch(`${this.memoryApi}/api/memory/status`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get memory stats:', error);
            return null;
        }
    }
}

// Example usage
async function example() {
    const claude = new ClaudeWithMemory('your-anthropic-api-key');
    
    // First conversation
    console.log('🤖 First conversation:');
    const response1 = await claude.chatWithMemory(
        "Hi Claude! I'm working on a Next.js project with TypeScript. I really prefer functional programming and clean architecture.",
        "You are a helpful coding assistant with persistent memory."
    );
    console.log('Claude:', response1);
    
    // Later conversation (Claude will remember preferences)
    console.log('\n🤖 Later conversation:');
    const response2 = await claude.chatWithMemory(
        "Can you help me design a component for user authentication?",
        "You are a helpful coding assistant with persistent memory."
    );
    console.log('Claude:', response2);
    
    // Check memory stats
    const stats = await claude.getMemoryStats();
    console.log('\n📊 Memory Stats:', stats);
}

export { ClaudeWithMemory };
