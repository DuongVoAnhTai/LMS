import { IEmbeddingProvider } from './IEmbeddingProvider';

interface OllamaEmbeddingResponse {
    embedding: number[];
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'nomic-embed-text') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    /**
     * Tạo embedding cho một đoạn text
     */
    async createEmbedding(text: string): Promise<number[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data: OllamaEmbeddingResponse = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('Error creating embedding with Ollama:', error);
            throw error;
        }
    }

    /**
     * Tạo embedding cho nhiều đoạn text (batch)
     * Ollama không có rate limit nên có thể gọi song song
     */
    async createEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            console.log(`Creating ${texts.length} embeddings with Ollama...`);

            // Gọi song song để tăng tốc độ
            const embeddings = await Promise.all(
                texts.map(text => this.createEmbedding(text))
            );

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
