import { IEmbeddingProvider } from './IEmbeddingProvider';

interface OllamaEmbeddingResponse {
    embedding: number[];
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
    private baseUrl: string;
    private model: string;
    private timeout: number;
    private delayBetweenCalls: number;

    constructor(
        baseUrl: string = 'http://localhost:11434',
        model: string = 'nomic-embed-text',
        timeout: number = 120000, // 2 phút timeout
        delayBetweenCalls: number = 100 // 100ms delay giữa các calls
    ) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.timeout = timeout;
        this.delayBetweenCalls = delayBetweenCalls;
    }

    /**
     * Helper để delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Tạo embedding cho một đoạn text
     */
    async createEmbedding(text: string): Promise<number[]> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data: OllamaEmbeddingResponse = await response.json();
            return data.embedding;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Ollama embedding request timed out after ${this.timeout}ms`);
            }
            console.error('Error creating embedding with Ollama:', error);
            throw error;
        }
    }

    /**
     * Tạo embedding cho nhiều đoạn text (batch)
     * Gọi tuần tự với delay để tránh quá tải Ollama
     */
    async createEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            console.log(`Creating ${texts.length} embeddings with Ollama (sequential with ${this.delayBetweenCalls}ms delay)...`);

            const embeddings: number[][] = [];

            for (let i = 0; i < texts.length; i++) {
                // Log tiến trình mỗi 10 chunks
                if (i % 10 === 0) {
                    console.log(`  Processing chunk ${i + 1}/${texts.length}...`);
                }

                const embedding = await this.createEmbedding(texts[i]);
                embeddings.push(embedding);

                // Delay giữa các calls (trừ call cuối)
                if (i < texts.length - 1 && this.delayBetweenCalls > 0) {
                    await this.delay(this.delayBetweenCalls);
                }
            }

            console.log(`✓ Created ${embeddings.length} embeddings successfully`);
            return embeddings;
        } catch (error) {
            console.error('Error creating batch embeddings with Ollama:', error);
            throw error;
        }
    }

    /**
     * Chia text thành các chunks nhỏ
     */
    chunkText(
        text: string,
        chunkSize: number = 1000,
        overlap: number = 200
    ): string[] {
        const chunks: string[] = [];
        let start = 0;

        // Loại bỏ whitespace dư thừa
        text = text.replace(/\s+/g, ' ').trim();

        while (start < text.length) {
            let end = start + chunkSize;

            // Nếu không phải chunk cuối, tìm điểm ngắt tự nhiên
            if (end < text.length) {
                // Tìm dấu câu gần nhất
                const lastPeriod = text.lastIndexOf('.', end);
                const lastQuestion = text.lastIndexOf('?', end);
                const lastExclamation = text.lastIndexOf('!', end);
                const lastNewline = text.lastIndexOf('\n', end);

                const breakPoint = Math.max(
                    lastPeriod,
                    lastQuestion,
                    lastExclamation,
                    lastNewline
                );

                if (breakPoint > start) {
                    end = breakPoint + 1;
                }
            }

            const chunk = text.slice(start, end).trim();
            if (chunk) {
                chunks.push(chunk);
            }

            start = end - overlap;
        }

        return chunks;
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
}
