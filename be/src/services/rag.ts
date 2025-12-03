// src/services/rag.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { vectorStoreService } from './vectorStore';
import { fileProcessorService } from './fileProcessor';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class RAGService {
    private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
            `[Document ${index + 1}] (Relevance: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content}`
        );

        return `
Relevant information from conversation history:

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

            prompt += `User's current message: ${userMessage}\n\n`;

            if (relevantDocs.length > 0) {
                prompt += `Please answer based on the relevant information provided above. If the information doesn't fully answer the question, you can also use your general knowledge but mention that some information comes from the conversation history.`;
            } else {
                prompt += `No relevant context found in conversation history. Please answer based on your general knowledge.`;
            }

            // Tạo chat với history nếu có
            const chat = this.model.startChat({
                history: conversationHistory?.map(msg => ({
                    role: msg.role === 'USER' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                })) || [],
            });

            // Gửi message và nhận response
            const result = await chat.sendMessage(prompt);
            const response = result.response;
            const aiReply = response.text();

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