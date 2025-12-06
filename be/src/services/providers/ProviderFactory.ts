import { IEmbeddingProvider } from './IEmbeddingProvider';
import { IGenerationProvider } from './IGenerationProvider';
import { GeminiEmbeddingProvider } from './GeminiEmbeddingProvider';
import { GeminiGenerationProvider } from './GeminiGenerationProvider';
import { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider';
import { OllamaGenerationProvider } from './OllamaGenerationProvider';

export type EmbeddingProviderType = 'gemini' | 'ollama';
export type GenerationProviderType = 'gemini' | 'ollama';

export class ProviderFactory {
    /**
     * Tạo embedding provider dựa trên config
     */
    static createEmbeddingProvider(
        type?: EmbeddingProviderType,
        options?: {
            ollamaUrl?: string;
            ollamaModel?: string;
        }
    ): IEmbeddingProvider {
        const providerType = type || (process.env.EMBEDDING_PROVIDER as EmbeddingProviderType) || 'gemini';

        switch (providerType) {
            case 'ollama':
                return new OllamaEmbeddingProvider(
                    options?.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
                    options?.ollamaModel || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
                );
            case 'gemini':
            default:
                return new GeminiEmbeddingProvider();
        }
    }

    /**
     * Tạo generation provider dựa trên config
     */
    static createGenerationProvider(
        type?: GenerationProviderType,
        options?: {
            ollamaUrl?: string;
            ollamaModel?: string;
        }
    ): IGenerationProvider {
        const providerType = type || (process.env.GENERATION_PROVIDER as GenerationProviderType) || 'gemini';

        switch (providerType) {
            case 'ollama':
                return new OllamaGenerationProvider(
                    options?.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
                    options?.ollamaModel || process.env.OLLAMA_GENERATION_MODEL || 'qwen3:8b'
                );
            case 'gemini':
            default:
                return new GeminiGenerationProvider();
        }
    }

    /**
     * Tạo embedding provider với fallback logic
     * Thử Ollama trước, nếu không available thì dùng Gemini
     */
    static async createEmbeddingProviderWithFallback(): Promise<IEmbeddingProvider> {
        const preferredType = (process.env.EMBEDDING_PROVIDER as EmbeddingProviderType) || 'ollama';

        if (preferredType === 'ollama') {
            const ollamaProvider = new OllamaEmbeddingProvider(
                process.env.OLLAMA_URL || 'http://localhost:11434',
                process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
            );

            const isAvailable = await ollamaProvider.isAvailable();
            if (isAvailable) {
                const hasModel = await ollamaProvider.hasModel();
                if (hasModel) {
                    console.log('Using Ollama for embeddings');
                    return ollamaProvider;
                } else {
                    console.warn('Ollama is running but model not found. Please run: ollama pull nomic-embed-text');
                }
            } else {
                console.warn('Ollama is not available, falling back to Gemini');
            }
        }

        console.log('Using Gemini for embeddings');
        return new GeminiEmbeddingProvider();
    }

    /**
     * Tạo generation provider với fallback logic
     */
    static async createGenerationProviderWithFallback(): Promise<IGenerationProvider> {
        const preferredType = (process.env.GENERATION_PROVIDER as GenerationProviderType) || 'ollama';

        if (preferredType === 'ollama') {
            const ollamaProvider = new OllamaGenerationProvider(
                process.env.OLLAMA_URL || 'http://localhost:11434',
                process.env.OLLAMA_GENERATION_MODEL || 'qwen3:8b'
            );

            const isAvailable = await ollamaProvider.isAvailable();
            if (isAvailable) {
                const hasModel = await ollamaProvider.hasModel();
                if (hasModel) {
                    console.log('Using Ollama (Qwen3) for text generation');
                    return ollamaProvider;
                } else {
                    console.warn('Ollama is running but model not found. Please run: ollama pull qwen3:8b');
                }
            } else {
                console.warn('Ollama is not available, falling back to Gemini');
            }
        }

        console.log('Using Gemini for text generation');
        return new GeminiGenerationProvider();
    }
}
