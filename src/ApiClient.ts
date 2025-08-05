/**
 * API Client for CodeContextPro-MES
 * Replaces Firebase/Stripe complexity with simple HTTP calls
 */

export interface ApiMemory {
  id: number;
  content: string;
  relevance: number;
  timestamp: string;
  type: string;
  context: string;
  tags: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async remember(content: string, context?: string, type?: string): Promise<{ memoryId: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          context: context || 'cli-command',
          type: type || 'general'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { success: boolean; memoryId?: number; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to store memory');
      }

      return { memoryId: result.memoryId! };
    } catch (error) {
      throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recall(query: string, limit: number = 10): Promise<ApiMemory[]> {
    try {
      const url = new URL(`${this.baseUrl}/api/memory/recall`);
      url.searchParams.set('query', query);
      url.searchParams.set('limit', limit.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { success: boolean; memories?: ApiMemory[]; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to recall memories');
      }

      return result.memories || [];
    } catch (error) {
      throw new Error(`Failed to recall memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async status(): Promise<{
    project: { path: string; dbPath: string };
    memory: { totalMemories: number; totalSizeKB: number; lastUpdated: string };
    system: { ready: boolean; version: string; engine: string };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/status`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as {
        success: boolean;
        error?: string;
        project?: { path: string; dbPath: string };
        memory?: { totalMemories: number; totalSizeKB: number; lastUpdated: string };
        system?: { ready: boolean; version: string; engine: string };
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to get status');
      }

      return {
        project: result.project!,
        memory: result.memory!,
        system: result.system!
      };
    } catch (error) {
      throw new Error(`Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/status`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
