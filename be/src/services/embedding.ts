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
        chunkSize: number = 2000,
        overlap: number = 200
    ): string[] {
        const chunks: string[] = [];
        let start = 0;

        // Loại bỏ whitespace dư thừa
        text = text.replace(/[ \t]+/g, ' ').trim();

        if (text.length === 0) {
            return chunks;
        }

        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length);

            // Nếu không phải chunk cuối, tìm điểm ngắt tự nhiên
            if (end < text.length) {
                const searchText = text.slice(start, end);
                const lastPeriod = searchText.lastIndexOf('.');
                const lastQuestion = searchText.lastIndexOf('?');
                const lastExclamation = searchText.lastIndexOf('!');

                const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclamation);

                if (breakPoint > (end - start) * 0.5) {
                    end = start + breakPoint + 1;
                }
            }

            const chunk = text.slice(start, end).trim();
            if (chunk) {
                chunks.push(chunk);
            }

            const nextStart = end - overlap;
            start = nextStart > start ? nextStart : end;
        }

        return chunks;
    }
}

export const embeddingService = new EmbeddingService();