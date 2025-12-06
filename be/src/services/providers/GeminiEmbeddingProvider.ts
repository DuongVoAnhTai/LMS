import { GoogleGenerativeAI } from '@google/generative-ai';
import { IEmbeddingProvider } from './IEmbeddingProvider';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
    private model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    /**
     * Sleep helper function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Tạo embedding cho một đoạn text với retry logic
     */
    async createEmbedding(text: string, retries: number = 3): Promise<number[]> {
        let lastError: any;

        for (let i = 0; i < retries; i++) {
            try {
                // Add delay between requests to avoid rate limiting
                if (i > 0) {
                    const delay = Math.pow(2, i) * 30000; // Exponential backoff: 30s, 60s, 120s
                    console.log(`Retrying in ${delay / 1000}s... (attempt ${i + 1}/${retries})`);
                    await this.sleep(delay);
                }

                const result = await this.model.embedContent(text);
                return result.embedding.values;
            } catch (error: any) {
                lastError = error;

                // Check if it's a rate limit error
                if (error?.status === 429) {
                    console.warn(`Rate limit hit, attempt ${i + 1}/${retries}`);
                    if (i < retries - 1) continue; // Try again
                }

                // For other errors, throw immediately
                if (error?.status !== 429) {
                    console.error('Error creating embedding:', error);
                    throw error;
                }
            }
        }

        console.error('Error creating embedding after retries:', lastError);
        throw lastError;
    }

    /**
     * Tạo embedding cho nhiều đoạn text (batch) với delay để tránh rate limit
     */
    async createEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const embeddings: number[][] = [];
            const delayBetweenRequests = 30000; // 30 second delay between each request

            for (let i = 0; i < texts.length; i++) {
                console.log(`Creating embedding ${i + 1}/${texts.length}...`);

                // Add delay between requests (except for the first one)
                if (i > 0) {
                    await this.sleep(delayBetweenRequests);
                }

                const embedding = await this.createEmbedding(texts[i]);
                embeddings.push(embedding);
            }

            return embeddings;
        } catch (error) {
            console.error('Error creating batch embeddings:', error);
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
}
