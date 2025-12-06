// src/services/rag.service.ts
import { IGenerationProvider } from './providers/IGenerationProvider';
import { ProviderFactory } from './providers/ProviderFactory';
import { vectorStoreService } from './vectorStore';
import { fileProcessorService } from './fileProcessor';

export class RAGService {
    private generationProvider: IGenerationProvider | null = null;

    /**
     * Khởi tạo generation provider (lazy initialization)
     */
    private async getGenerationProvider(): Promise<IGenerationProvider> {
        if (!this.generationProvider) {
            this.generationProvider = await ProviderFactory.createGenerationProviderWithFallback();
        }
        return this.generationProvider;
    }

    /**
     * Xử lý và thêm file vào vector store
     */
    async processAndStoreFile(
        conversationId: string,
        fileUrl: string,
        fileName: string,
        fileFormat: string
    ): Promise<void> {
        try {
            console.log(`Processing file: ${fileName}`);

            // Download file
            const buffer = await fileProcessorService.downloadFile(fileUrl);

            // Extract text từ file
            const text = await fileProcessorService.processFile(buffer, fileFormat);

            if (!text || text.trim().length === 0) {
                throw new Error('No text content extracted from file');
            }

            // Lưu vào vector store
            await vectorStoreService.addDocument({
                conversationId,
                content: text,
                sourceType: 'FILE',
                sourceName: fileName,
                metadata: {
                    fileFormat,
                    fileUrl,
                    processedAt: new Date().toISOString(),
                },
            });

            console.log(`File processed and stored: ${fileName}`);
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }

    /**
     * Thêm text message vào vector store
     */
    async storeTextMessage(
        conversationId: string,
        content: string,
        messageId?: string
    ): Promise<void> {
        try {
            // Chỉ lưu messages đủ dài (tránh spam vector store)
            if (content.length < 20) {
                return;
            }

            await vectorStoreService.addDocument({
                conversationId,
                content,
                sourceType: 'TEXT',
                metadata: {
                    messageId,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('Error storing text message:', error);
            // Không throw error để không làm gián đoạn chat flow
        }
    }

    /**
     * Tạo context từ relevant documents
     */
    private buildContext(documents: Array<{ content: string; similarity: number }>): string {
        if (documents.length === 0) {
            return '';
        }

        const contextParts = documents.map((doc, index) =>
            `[Tài liệu ${index + 1}] (Độ liên quan: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content}`
        );

        return `
Thông tin liên quan từ lịch sử hội thoại:

${contextParts.join('\n\n---\n\n')}
`;
    }

    /**
     * Tạo AI reply sử dụng RAG
     */
    async generateReply(
        conversationId: string,
        userMessage: string,
        conversationHistory?: Array<{ role: string; content: string }>
    ): Promise<string> {
        try {
            // Tìm kiếm relevant documents
            const relevantDocs = await vectorStoreService.searchSimilar(
                conversationId,
                userMessage,
                5 // Lấy top 5 documents liên quan nhất
            );

            // Tạo context từ relevant documents
            const context = this.buildContext(relevantDocs);

            // Tạo prompt với context
            let prompt = '';

            if (context) {
                prompt += context + '\n\n---\n\n';
            }

            prompt += `Tin nhắn hiện tại của người dùng: ${userMessage}\n\n`;

            if (relevantDocs.length > 0) {
                prompt += `Vui lòng trả lời bằng tiếng Việt dựa trên thông tin liên quan được cung cấp ở trên. Nếu thông tin không trả lời đầy đủ câu hỏi, bạn cũng có thể sử dụng kiến thức chung của mình nhưng hãy đề cập rằng một số thông tin đến từ lịch sử hội thoại.`;
            } else {
                prompt += `Không tìm thấy ngữ cảnh liên quan trong lịch sử hội thoại. Vui lòng trả lời bằng tiếng Việt dựa trên kiến thức chung của bạn.`;
            }

            // Sử dụng generation provider để tạo response
            const provider = await this.getGenerationProvider();
            const aiReply = await provider.generateWithHistory(prompt, conversationHistory);

            return aiReply;
        } catch (error) {
            console.error('Error generating AI reply:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra xem có nên sử dụng RAG không
     */
    async shouldUseRAG(conversationId: string): Promise<boolean> {
        return vectorStoreService.hasVectors(conversationId);
    }
}

export const ragService = new RAGService();