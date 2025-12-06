// Interface chung cho các text generation providers
export interface IGenerationProvider {
    /**
     * Tạo response từ prompt
     */
    generateResponse(prompt: string): Promise<string>;

    /**
     * Tạo response với conversation history
     */
    generateWithHistory(
        prompt: string,
        history?: Array<{ role: string; content: string }>
    ): Promise<string>;
}
