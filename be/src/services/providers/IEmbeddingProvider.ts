// Interface chung cho các embedding providers
export interface IEmbeddingProvider {
    /**
     * Tạo embedding cho một đoạn text
     */
    createEmbedding(text: string): Promise<number[]>;

    /**
     * Tạo embedding cho nhiều đoạn text (batch)
     */
    createEmbeddings(texts: string[]): Promise<number[][]>;

    /**
     * Chia text thành các chunks nhỏ
     */
    chunkText(text: string, chunkSize?: number, overlap?: number): string[];
}
