/**
 * Utility functions cho providers
 */

/**
 * Kiểm tra và validate embedding vector
 */
export function validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
        console.error('Embedding is not an array:', typeof embedding);
        return false;
    }

    if (embedding.length === 0) {
        console.error('Embedding is empty');
        return false;
    }

    if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
        console.error('Embedding contains non-numeric values');
        return false;
    }

    return true;
}

/**
 * Format embedding cho Supabase
 * Supabase pgvector có thể cần format đặc biệt
 */
export function formatEmbeddingForSupabase(embedding: number[]): string {
    // Validate trước
    if (!validateEmbedding(embedding)) {
        throw new Error('Invalid embedding vector');
    }

    // Supabase pgvector expects array format: [1.2, 3.4, ...]
    // Hoặc string format: "[1.2, 3.4, ...]"
    return JSON.stringify(embedding);
}

/**
 * Debug helper: In thông tin embedding
 */
export function debugEmbedding(embedding: number[], label: string = 'Embedding'): void {
    console.log(`[DEBUG] ${label}:`);
    console.log(`  - Type: ${typeof embedding}`);
    console.log(`  - Is Array: ${Array.isArray(embedding)}`);
    console.log(`  - Length: ${embedding?.length || 'N/A'}`);
    console.log(`  - First 5 values: ${embedding?.slice(0, 5).join(', ') || 'N/A'}`);
    console.log(`  - Sample value types: ${embedding?.slice(0, 3).map(v => typeof v).join(', ') || 'N/A'}`);
}

/**
 * So sánh dimensions giữa embeddings
 */
export function compareEmbeddingDimensions(emb1: number[], emb2: number[]): void {
    console.log('[COMPARE] Embedding Dimensions:');
    console.log(`  - Embedding 1: ${emb1.length} dimensions`);
    console.log(`  - Embedding 2: ${emb2.length} dimensions`);
    console.log(`  - Match: ${emb1.length === emb2.length ? '✓' : '✗'}`);
}
