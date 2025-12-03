// src/services/vectorStore.service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from './embedding';

interface VectorDocument {
    conversationId: string;
    content: string;
    sourceType: 'TEXT' | 'PDF' | 'FILE';
    sourceName?: string;
    metadata?: Record<string, any>;
}

interface SearchResult {
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity: number;
}

export class VectorStoreService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
    }

    /**
     * Thêm document vào vector store
     */
    async addDocument(doc: VectorDocument): Promise<void> {
        try {
            // Chia text thành chunks
            const chunks = embeddingService.chunkText(doc.content);

            // Tạo embeddings cho tất cả chunks
            const embeddings = await embeddingService.createEmbeddings(chunks);

            // Chuẩn bị data để insert
            const records = chunks.map((chunk, index) => ({
                conversation_id: doc.conversationId,
                content: chunk,
                embedding: JSON.stringify(embeddings[index]), // Supabase expects string for vector
                source_type: doc.sourceType,
                source_name: doc.sourceName,
                chunk_index: index,
                metadata: doc.metadata || {},
            }));

            // Insert vào database
            const { error } = await this.supabase
                .from('vector_embeddings')
                .insert(records);

            if (error) {
                console.error('Supabase insert error:', error);
                throw error;
            }

            console.log(`Added ${chunks.length} chunks to vector store`);
        } catch (error) {
            console.error('Error adding document to vector store:', error);
            throw error;
        }
    }

    /**
     * Tìm kiếm documents tương tự
     */
    async searchSimilar(
        conversationId: string,
        query: string,
        limit: number = 5
    ): Promise<SearchResult[]> {
        try {
            // Tạo embedding cho query
            const queryEmbedding = await embeddingService.createEmbedding(query);

            // Gọi function match_documents trong Supabase
            const { data, error } = await this.supabase.rpc('match_documents', {
                query_embedding: JSON.stringify(queryEmbedding),
                match_conversation_id: conversationId,
                match_count: limit,
            });

            if (error) {
                console.error('Supabase search error:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error searching similar documents:', error);
            throw error;
        }
    }

    /**
     * Xóa tất cả vectors của một conversation
     */
    async deleteConversationVectors(conversationId: string): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('vector_embeddings')
                .delete()
                .eq('conversation_id', conversationId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting conversation vectors:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra xem conversation đã có vectors chưa
     */
    async hasVectors(conversationId: string): Promise<boolean> {
        try {
            const { count, error } = await this.supabase
                .from('vector_embeddings')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conversationId);

            if (error) throw error;
            return (count || 0) > 0;
        } catch (error) {
            console.error('Error checking vectors:', error);
            return false;
        }
    }
}

export const vectorStoreService = new VectorStoreService();