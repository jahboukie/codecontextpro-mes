/**
 * OpenAI ChatGPT Integration with CodeContextPro Memory
 * This shows how to give ChatGPT persistent memory using our API
 */

import OpenAI from 'openai';

class ChatGPTWithMemory {
    constructor(apiKey, memoryApiUrl = 'http://localhost:3000') {
        this.openai = new OpenAI({ apiKey });
        this.memoryApi = memoryApiUrl;
    }

    // Store information in persistent memory
    async storeMemory(content, context = 'chatgpt-session') {
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
                memoryContext = '\n\nRelevant memories from previous conversations:\n';
                relevantMemories.forEach((memory, index) => {
                    memoryContext += `${index + 1}. ${memory.content} (${memory.context})\n`;
                });
            }

            // 3. Create enhanced system prompt
            const enhancedSystemPrompt = `${systemContext}

You have access to persistent memory. Use the context below to provide personalized responses.
${memoryContext}

Important: If you learn something new about the user or important information, 
I will store it in memory for future conversations.`;

            // 4. Get ChatGPT response
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: enhancedSystemPrompt },
                    { role: "user", content: userMessage }
                ],
                functions: [
                    {
                        name: "store_memory",
                        description: "Store important information for future reference",
                        parameters: {
                            type: "object",
                            properties: {
                                content: {
                                    type: "string",
                                    description: "Information to remember"
                                },
                                context: {
                                    type: "string", 
                                    description: "Context or category for this memory"
                                }
                            },
                            required: ["content"]
                        }
                    }
                ],
                function_call: "auto"
            });

            const response = completion.choices[0].message;

            // 5. Handle function calls (memory storage)
            if (response.function_call) {
                const functionArgs = JSON.parse(response.function_call.arguments);
                await this.storeMemory(functionArgs.content, functionArgs.context || 'auto-stored');
                
                // Get final response after storing memory
                const finalCompletion = await this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        { role: "system", content: enhancedSystemPrompt },
                        { role: "user", content: userMessage },
                        response,
                        {
                            role: "function",
                            name: "store_memory",
                            content: "Memory stored successfully"
                        }
                    ]
                });
                return finalCompletion.choices[0].message.content;
            }

            return response.content;

        } catch (error) {
            console.error('Chat with memory failed:', error);
            return 'Sorry, I encountered an error while processing your request.';
        }
    }
}

// Example usage
async function example() {
    const chatbot = new ChatGPTWithMemory('your-openai-api-key');
    
    // First conversation
    console.log('🤖 First conversation:');
    const response1 = await chatbot.chatWithMemory(
        "Hi! I'm a TypeScript developer working on a React project. I prefer functional programming.",
        "You are a helpful coding assistant."
    );
    console.log('ChatGPT:', response1);
    
    // Later conversation (ChatGPT will remember preferences)
    console.log('\n🤖 Later conversation:');
    const response2 = await chatbot.chatWithMemory(
        "Can you help me with a component design?",
        "You are a helpful coding assistant."
    );
    console.log('ChatGPT:', response2);
}

export { ChatGPTWithMemory };
