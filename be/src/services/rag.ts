// src/services/rag.service.ts
import { IGenerationProvider } from './providers/IGenerationProvider';
import { ProviderFactory } from './providers/ProviderFactory';
import { vectorStoreService } from './vectorStore';
import { fileProcessorService } from './fileProcessor';

const SYSTEM_PROMPT = `
Bạn đang hoạt động ở chế độ CONTEXT-LOCKED QA.

QUY TẮC BẮT BUỘC:
1. CHỈ được sử dụng thông tin trong <CONTEXT>.
2. Mọi kiến thức ngoài <CONTEXT> mặc định là KHÔNG TỒN TẠI.
3. Nếu không có đủ thông tin trong <CONTEXT> thì trả về đúng:
"Không có thông tin được đề cập trong context."
4. CẤM tuyệt đối:
- Suy luận
- Tổng hợp ngoài context
- Dùng kiến thức huấn luyện
- Trả lời một phần

NGOẠI LỆ DUY NHẤT:
Chỉ khi câu hỏi thuộc nhóm:
- bạn là ai
- bạn có thể làm gì
- khả năng của bạn
- bạn hỗ trợ gì
thì mới được dùng kiến thức chung.

Nếu vi phạm thì câu trả lời bị coi là SAI.
`;

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

    private isCapabilityQuestion(question: string): boolean {
        const q = question.toLowerCase();

        const patterns = [
            'bạn là ai',
            'bạn có thể làm gì',
            'bạn làm được gì',
            'bạn hỗ trợ gì',
            'khả năng của bạn',
            'bạn giúp được gì'
        ];

        return patterns.some(p => q.includes(p));
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

        return documents
            .map((doc, index) => `[Tài liệu ${index + 1}]\n${doc.content}`)
            .join('\n\n---\n\n');
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

            // CÂU HỎI NĂNG LỰC
            if (this.isCapabilityQuestion(userMessage)) {
                const provider = await this.getGenerationProvider();

                return await provider.generateWithHistory(
                    userMessage,
                    [
                        { role: 'system', content: 'Bạn là một trợ lý AI hữu ích. Hãy trả lời ngắn gọn, đúng trọng tâm.' },
                        ...(conversationHistory || [])
                    ]
                );
            }

            // RAG BỊ KHÓA CONTEXT
            const relevantDocs = await vectorStoreService.searchSimilar(
                conversationId,
                userMessage,
                5
            );

            const context = this.buildContext(relevantDocs);

            const userPrompt = `
<CONTEXT>
${context || 'NONE'}
</CONTEXT>

<QUESTION>
${userMessage}
</QUESTION>

Hãy trả lời theo đúng quy tắc system prompt.
`;

            const provider = await this.getGenerationProvider();

            const aiReply = await provider.generateWithHistory(
                userPrompt,
                [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...(conversationHistory || []).filter(m => m.role !== 'system')
                ]
            );

            return aiReply.trim();

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