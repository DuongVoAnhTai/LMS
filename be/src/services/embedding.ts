import { IEmbeddingProvider } from './providers/IEmbeddingProvider';
import { ProviderFactory } from './providers/ProviderFactory';

export class EmbeddingService {
    private provider: IEmbeddingProvider | null = null;

    /**
     * Khởi tạo provider (lazy initialization)
     */
    private async getProvider(): Promise<IEmbeddingProvider> {
        if (!this.provider) {
            this.provider = await ProviderFactory.createEmbeddingProviderWithFallback();
        }
        return this.provider;
    }

    /**
     * Tạo embedding cho một đoạn text
     */
    async createEmbedding(text: string): Promise<number[]> {
        const provider = await this.getProvider();
        return provider.createEmbedding(text);
    }

    /**
     * Tạo embedding cho nhiều đoạn text (batch)
     */
    async createEmbeddings(texts: string[]): Promise<number[][]> {
        const provider = await this.getProvider();
        return provider.createEmbeddings(texts);
    }

    /**
     * Chia text thành các chunks nhỏ
     */
    chunkText(
        text: string,
        chunkSize: number = 1000,
        overlap: number = 200
    ): string[] {
        // Sử dụng implementation chung
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