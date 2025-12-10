import { ragService } from '../services/rag';
import { vectorStoreService } from '../services/vectorStore';
import { fileProcessorService } from '../services/fileProcessor';
import * as fs from 'fs';
import * as path from 'path';

// Lấy đường dẫn thư mục chứa file test (tương thích cả ts-node và compiled js)
const getTestDir = () => {
    // Nếu chạy từ source ts
    const tsPath = path.resolve(__dirname, '.');
    if (fs.existsSync(path.join(tsPath, 'test.pdf'))) {
        return tsPath;
    }
    // Nếu chạy từ compiled js, test files nằm ở src/tests
    return path.resolve(process.cwd(), 'src/tests');
};

// Cấu hình test files - thay đổi đường dẫn theo file thực tế của bạn
const TEST_FILES = {
    pdf: 'test.pdf',
    // docx: 'test.docx',
    // txt: 'test.txt',
};

export async function testRAG() {
    const testConversationId = '96d2fdf9-b1ec-432f-adb8-7b3cb22f9b17';

    try {
        console.log('=== RAG System Test with Files ===\n');

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

        // 1. Test xử lý và thêm files
        console.log('1. Processing and adding test files...\n');

        for (const [format, filePath] of Object.entries(TEST_FILES)) {
            const absolutePath = path.resolve(getTestDir(), filePath);

            // Kiểm tra file tồn tại
            if (!fs.existsSync(absolutePath)) {
                console.log(`⚠ File not found: ${absolutePath}`);
                console.log(`  Skipping ${format.toUpperCase()} test...\n`);
                continue;
            }

            console.log(`Processing ${format.toUpperCase()} file: ${absolutePath}`);

            // Đọc file từ local
            const buffer = fs.readFileSync(absolutePath);

            // Xử lý file để extract text
            const extractedText = await fileProcessorService.processFile(buffer, format);

            console.log(`  Extracted text length: ${extractedText.length} characters`);
            console.log(`  Preview: ${extractedText.substring(0, 200).replace(/\n/g, ' ')}...`);

            // Lưu vào vector store
            await vectorStoreService.addDocument({
                conversationId: testConversationId,
                content: extractedText,
                sourceType: 'FILE',
                sourceName: path.basename(filePath),
                metadata: {
                    fileFormat: format,
                    test: true,
                    processedAt: new Date().toISOString(),
                },
            });

            console.log(`  ✓ ${format.toUpperCase()} file processed and stored\n`);
        }

        // 2. Test search trong documents đã thêm
        console.log('2. Testing search in processed files...');
        const searchQuery = 'Nội dung chính của tài liệu là gì?';
        console.log(`Search query: "${searchQuery}"\n`);

        const searchResults = await vectorStoreService.searchSimilar(
            testConversationId,
            searchQuery,
            3
        );

        if (searchResults.length === 0) {
            console.log('No search results found.\n');
        } else {
            console.log('Search results:');
            searchResults.forEach((result, index) => {
                console.log(`\n[${index + 1}] Similarity: ${(result.similarity * 100).toFixed(1)}%`);
                console.log(`Content: ${result.content.substring(0, 150).replace(/\n/g, ' ')}...`);
            });
            console.log();
        }

        // 3. Test RAG reply với câu hỏi về nội dung file
        console.log('3. Testing RAG reply generation...');
        const userQuestion = 'Vòng lặp thói quen và 4 Quy luật thay đổi hành vi';
        console.log(`User question: "${userQuestion}"\n`);

        const reply = await ragService.generateReply(
            testConversationId,
            userQuestion
        );

        console.log('AI Reply:');
        console.log(reply);
        console.log();

        // 4. Test với câu hỏi cụ thể hơn
        console.log('4. Testing with a specific question...');
        const specificQuestion = 'Có những điểm quan trọng nào được đề cập trong tài liệu?';
        console.log(`User question: "${specificQuestion}"\n`);

        const reply2 = await ragService.generateReply(
            testConversationId,
            specificQuestion
        );

        console.log('AI Reply:');
        console.log(reply2);
        console.log();

        // 5. Cleanup
        console.log('5. Cleaning up test data...');
        await vectorStoreService.deleteConversationVectors(testConversationId);
        console.log('✓ Test data cleaned\n');

        console.log('=== Test Complete ===');
    } catch (error) {
        console.error('Test failed:', error);

        // Cleanup on error
        try {
            await vectorStoreService.deleteConversationVectors(testConversationId);
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
    }
}

testRAG();