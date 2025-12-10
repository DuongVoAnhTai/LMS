import { IGenerationProvider } from './IGenerationProvider';

interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OllamaGenerateRequest {
    model: string;
    prompt?: string;
    messages?: OllamaMessage[];
    stream?: boolean;
}

interface OllamaGenerateResponse {
    model: string;
    message?: {
        role: string;
        content: string;
    };
    response?: string;
    done: boolean;
}

export class OllamaGenerationProvider implements IGenerationProvider {
    private baseUrl: string;
    private model: string;
    private timeout: number;

    constructor(
        baseUrl: string = 'http://localhost:11434',
        model: string = 'qwen3:8b',
        timeout: number = 300000 // 5 phút timeout cho generation (lâu hơn embedding)
    ) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.timeout = timeout;
    }

    /**
     * Tạo response từ prompt đơn giản
     */
    async generateResponse(prompt: string): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                } as OllamaGenerateRequest),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data: OllamaGenerateResponse = await response.json();
            return data.response || '';
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Ollama generation request timed out after ${this.timeout}ms`);
            }
            console.error('Error generating response with Ollama:', error);
            throw error;
        }
    }

    /**
     * Tạo response với conversation history
     */
    async generateWithHistory(
        prompt: string,
        history?: Array<{ role: string; content: string }>
    ): Promise<string> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            // Chuyển đổi history sang format của Ollama
            const messages: OllamaMessage[] = [];

            // Thêm conversation history
            if (history && history.length > 0) {
                for (const msg of history) {
                    messages.push({
                        role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
                        content: msg.content,
                    });
                }
            }

            // Thêm message hiện tại
            messages.push({
                role: 'user',
                content: prompt,
            });

            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    stream: false,
                } as OllamaGenerateRequest),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data: OllamaGenerateResponse = await response.json();
            return data.message?.content || '';
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Ollama chat request timed out after ${this.timeout}ms`);
            }
            console.error('Error generating response with history:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra xem Ollama có đang chạy không
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Kiểm tra xem model đã được pull chưa
     */
    async hasModel(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return false;

            const data = await response.json();
            return data.models?.some((m: any) => m.name.includes(this.model)) || false;
        } catch {
            return false;
        }
    }

    /**
     * Lấy danh sách models có sẵn
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return [];

            const data = await response.json();
            return data.models?.map((m: any) => m.name) || [];
        } catch {
            return [];
        }
    }
}
