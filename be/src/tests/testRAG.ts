import { ragService } from '../services/rag';
import { vectorStoreService } from '../services/vectorStore';

export async function testRAG() {
    const testConversationId = '96d2fdf9-b1ec-432f-adb8-7b3cb22f9b17';

    try {
        console.log('=== RAG System Test ===\n');

        // Hiển thị provider configuration
        console.log('Configuration:');
        console.log(`- Embedding Provider: ${process.env.EMBEDDING_PROVIDER || 'gemini'}`);
        console.log(`- Generation Provider: ${process.env.GENERATION_PROVIDER || 'gemini'}`);
        if (process.env.EMBEDDING_PROVIDER === 'ollama') {
            console.log(`- Ollama URL: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
            console.log(`- Embedding Model: ${process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'}`);
            console.log(`- Generation Model: ${process.env.OLLAMA_GENERATION_MODEL || 'qwen3:8b'}`);
        }
        console.log();

        // 1. Test thêm documents
        console.log('1. Adding test documents...');
        await vectorStoreService.addDocument({
            conversationId: testConversationId,
            content: `
        Next.js is a React framework for building full-stack web applications.
        It provides features like server-side rendering, static site generation,
        and API routes. Next.js 13 introduced the App Router with React Server Components.
      `,
            sourceType: 'TEXT',
            metadata: { test: true },
        });

        await vectorStoreService.addDocument({
            conversationId: testConversationId,
            content: `
        TypeScript is a strongly typed programming language that builds on JavaScript.
        It adds optional static typing to JavaScript, which can help catch errors
        early in development and improve code quality.
      `,
            sourceType: 'TEXT',
            metadata: { test: true },
        });

        console.log('✓ Documents added\n');

        // 2. Test search
        console.log('2. Testing search...');
        const searchResults = await vectorStoreService.searchSimilar(
            testConversationId,
            'What is Next.js?',
            3
        );

        console.log('Search results:');
        searchResults.forEach((result, index) => {
            console.log(`\n[${index + 1}] Similarity: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`Content: ${result.content.substring(0, 100)}...`);
        });
        console.log();

        // 3. Test RAG reply
        console.log('3. Testing RAG reply generation...');
        const reply = await ragService.generateReply(
            testConversationId,
            'Can you explain what Next.js is and its main features?'
        );

        console.log('AI Reply:');
        console.log(reply);
        console.log();

        // 4. Cleanup
        console.log('4. Cleaning up test data...');
        await vectorStoreService.deleteConversationVectors(testConversationId);
        console.log('✓ Test data cleaned\n');

        console.log('=== Test Complete ===');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testRAG();