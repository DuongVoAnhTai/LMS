import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGenerationProvider } from './IGenerationProvider';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class GeminiGenerationProvider implements IGenerationProvider {
    private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    /**
     * Tạo response từ prompt đơn giản
     */
    async generateResponse(prompt: string): Promise<string> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating response with Gemini:', error);
            throw error;
        }
    }

    /**
     * Tạo response với conversation history
     */
    async generateWithHistory(
        prompt: string,
        history?: Array<{ role: string; content: string }>
    ): Promise<string> {
        try {
            // Tạo chat với history nếu có
            const chat = this.model.startChat({
                history: history?.map(msg => ({
                    role: msg.role === 'USER' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                })) || [],
            });

            // Gửi message và nhận response
            const result = await chat.sendMessage(prompt);
            const response = result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating response with history:', error);
            throw error;
        }
    }
}
