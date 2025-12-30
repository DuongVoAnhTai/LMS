import Groq from 'groq-sdk';
import { IGenerationProvider } from './IGenerationProvider';

interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class GroqGenerationProvider implements IGenerationProvider {
    private client: Groq;
    private model: string;
    private maxRetries: number;

    constructor(
        apiKey?: string,
        model?: string,
        maxRetries: number = 3
    ) {
        this.client = new Groq({
            apiKey: apiKey || process.env.GROQ_API_KEY,
        });
        this.model = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.maxRetries = maxRetries;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateResponse(prompt: string): Promise<string> {
        return this.executeWithRetry(async () => {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
            });

            return completion.choices[0]?.message?.content || '';
        });
    }

    async generateWithHistory(
        prompt: string,
        history?: Array<{ role: string; content: string }>
    ): Promise<string> {
        return this.executeWithRetry(async () => {
            const messages: GroqMessage[] = [];

            if (history && history.length > 0) {
                for (const msg of history) {
                    const role = msg.role.toLowerCase();
                    let groqRole: 'system' | 'user' | 'assistant';
                    if (role === 'user') {
                        groqRole = 'user';
                    } else if (role === 'system') {
                        groqRole = 'system';
                    } else {
                        groqRole = 'assistant';
                    }
                    messages.push({
                        role: groqRole,
                        content: msg.content,
                    });
                }
            }

            messages.push({
                role: 'user',
                content: prompt,
            });

            const completion = await this.client.chat.completions.create({
                messages,
                model: this.model,
            });

            return completion.choices[0]?.message?.content || '';
        });
    }

    private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: any;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Groq API retry in ${delay / 1000}s... (attempt ${attempt + 1}/${this.maxRetries})`);
                    await this.sleep(delay);
                }

                return await fn();
            } catch (error: any) {
                lastError = error;

                const isRateLimitError =
                    error?.status === 429 ||
                    error?.statusCode === 429 ||
                    error?.error?.code === 'rate_limit_exceeded';

                if (isRateLimitError) {
                    console.warn(`Groq rate limit hit, attempt ${attempt + 1}/${this.maxRetries}`);

                    const retryAfter = error?.headers?.['retry-after'];
                    if (retryAfter && attempt < this.maxRetries - 1) {
                        const waitTime = parseInt(retryAfter, 10) * 1000;
                        console.log(`Waiting ${retryAfter}s as suggested by API...`);
                        await this.sleep(waitTime);
                    }

                    if (attempt < this.maxRetries - 1) continue;
                }

                if (!isRateLimitError) {
                    console.error('Error generating response with Groq:', error);
                    throw error;
                }
            }
        }

        console.error('Error generating response with Groq after retries:', lastError);
        throw lastError;
    }

    isAvailable(): boolean {
        return !!(process.env.GROQ_API_KEY);
    }
}
