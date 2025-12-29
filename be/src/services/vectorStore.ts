import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from './embedding';

interface VectorDocument {
    conversationId?: string;  // Optional - cho chat
    resourceId?: string;      // Optional - cho skill resource
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
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    /**
     * Thêm document vào vector store
     */
    async addDocument(doc: VectorDocument): Promise<void> {
        try {
            // Validate: phải có ít nhất 1 trong 2 (conversationId hoặc resourceId)
            if (!doc.conversationId && !doc.resourceId) {
                throw new Error('Either conversationId or resourceId is required');
            }

            const identifier = doc.conversationId
                ? `conversation: ${doc.conversationId}`
                : `resource: ${doc.resourceId}`;
            console.log(`[VectorStore] Adding document for ${identifier}`);
            console.log(`[VectorStore] Content length: ${doc.content.length}, Source: ${doc.sourceType}/${doc.sourceName}`);

            // Chia text thành chunks
            const chunks = embeddingService.chunkText(doc.content);
            console.log(`[VectorStore] Split into ${chunks.length} chunks`);

            // Tạo embeddings cho tất cả chunks
            const embeddings = await embeddingService.createEmbeddings(chunks);
            console.log(`[VectorStore] Created ${embeddings.length} embeddings`);

            // Chuẩn bị data để insert
            const records = chunks.map((chunk, index) => {
                return {
                    conversation_id: doc.conversationId || null,
                    resource_id: doc.resourceId || null,
                    content: chunk,
                    embedding: embeddings[index],
                    source_type: doc.sourceType,
                    source_name: doc.sourceName,
                    chunk_index: index,
                    metadata: doc.metadata || {},
                };
            });

            // Insert vào database
            console.log(`[VectorStore] Inserting ${records.length} records into database...`);
            const { error } = await this.supabase
                .from('vector_embeddings')
                .insert(records);

            if (error) {
                console.error('[VectorStore] Supabase insert error:', error);
                throw error;
            }

            console.log(`[VectorStore] Successfully added ${chunks.length} chunks to vector store`);
        } catch (error) {
            console.error('[VectorStore] Error adding document to vector store:', error);
            throw error;
        }
    }

    /**
     * Tìm kiếm documents tương tự
     */
    async searchSimilar(
        conversationId: string,
        query: string,
        limit: number = 7
    ): Promise<SearchResult[]> {
        try {
            console.log(`[VectorStore] Creating embedding for query: "${query.substring(0, 100)}..."`);

            // Tạo embedding cho query
            const queryEmbedding = await embeddingService.createEmbedding(query);
            console.log(`[VectorStore] Embedding created with dimension: ${queryEmbedding.length}`);

            // Gọi function match_documents trong Supabase
            console.log(`[VectorStore] Calling match_documents RPC for conversation: ${conversationId}, limit: ${limit}`);
            const { data, error } = await this.supabase.rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_conversation_id: conversationId,
                match_count: limit,
            });

            if (error) {
                console.error('[VectorStore] Supabase search error:', error);
                throw error;
            }

            console.log(`[VectorStore] RPC returned ${data?.length || 0} results`);
            if (data && data.length > 0) {
                console.log('[VectorStore] Sample result:', {
                    id: data[0].id,
                    similarity: data[0].similarity,
                    contentLength: data[0].content?.length
                });
            }

            return data || [];
        } catch (error) {
            console.error('[VectorStore] Error searching similar documents:', error);
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

    /**
     * Tìm kiếm documents theo resource_id
     */
    async searchByResource(
        resourceId: string,
        query: string,
        limit: number = 5
    ): Promise<SearchResult[]> {
        try {
            console.log(`[VectorStore] Creating embedding for query: "${query.substring(0, 100)}..."`);

            // Tạo embedding cho query
            const queryEmbedding = await embeddingService.createEmbedding(query);
            console.log(`[VectorStore] Embedding created with dimension: ${queryEmbedding.length}`);

            // Gọi function match_documents_by_resource trong Supabase
            console.log(`[VectorStore] Calling match_documents_by_resource RPC for resource: ${resourceId}, limit: ${limit}`);
            const { data, error } = await this.supabase.rpc('match_documents_by_resource', {
                query_embedding: queryEmbedding,
                match_resource_id: resourceId,
                match_count: limit,
            });

            if (error) {
                console.error('[VectorStore] Supabase search error:', error);
                throw error;
            }

            console.log(`[VectorStore] RPC returned ${data?.length || 0} results`);
            return data || [];
        } catch (error) {
            console.error('[VectorStore] Error searching by resource:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra xem resource đã có vectors chưa
     */
    async hasResourceVectors(resourceId: string): Promise<boolean> {
        try {
            const { count, error } = await this.supabase
                .from('vector_embeddings')
                .select('*', { count: 'exact', head: true })
                .eq('resource_id', resourceId);

            if (error) throw error;
            return (count || 0) > 0;
        } catch (error) {
            console.error('Error checking resource vectors:', error);
            return false;
        }
    }

    /**
     * Xóa tất cả vectors của một resource
     */
    async deleteResourceVectors(resourceId: string): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('vector_embeddings')
                .delete()
                .eq('resource_id', resourceId);

            if (error) throw error;
            console.log(`[VectorStore] Deleted vectors for resource: ${resourceId}`);
        } catch (error) {
            console.error('Error deleting resource vectors:', error);
            throw error;
        }
    }
}

export const vectorStoreService = new VectorStoreService();