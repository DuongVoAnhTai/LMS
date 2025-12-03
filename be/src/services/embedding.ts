import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class EmbeddingService {
    private model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    /**
     * Tạo embedding cho một đoạn text
     */
    async createEmbedding(text: string): Promise<number[]> {
        try {
            const result = await this.model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error('Error creating embedding:', error);
            throw error;
        }
    }

    /**
     * Tạo embedding cho nhiều đoạn text (batch)
     */
    async createEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const embeddings = await Promise.all(
                texts.map(text => this.createEmbedding(text))
            );
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

export const embeddingService = new EmbeddingService();