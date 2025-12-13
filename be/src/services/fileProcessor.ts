// src/services/fileProcessor.service.ts
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { PDFParse } from 'pdf-parse';

export class FileProcessorService {
    /**
     * Xử lý file PDF sử dụng pdf2json
     */
    async processPDF(buffer: Buffer): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const pdfParser = new PDFParser(null, true); // true = raw text mode

                pdfParser.on('pdfParser_dataError', (errData: Error | { parserError: Error }) => {
                    const error = errData instanceof Error ? errData : errData.parserError;
                    console.error('PDF parsing error:', error);
                    reject(new Error(`Failed to parse PDF: ${error.message}`));
                });

                pdfParser.on('pdfParser_dataReady', () => {
                    try {
                        const text = pdfParser.getRawTextContent().trim();

                        if (!text || text.length === 0) {
                            console.warn('No text content extracted from PDF');
                            reject(new Error('No text content extracted from PDF'));
                            return;
                        }

                        console.log(`Successfully extracted ${text.length} characters from PDF`);
                        resolve(text);
                    } catch (err) {
                        reject(new Error(`Failed to get text content: ${err instanceof Error ? err.message : String(err)}`));
                    }
                });

                // Parse PDF từ buffer
                pdfParser.parseBuffer(buffer);
            } catch (error) {
                console.error('Error processing PDF:', error);
                reject(new Error(`Failed to process PDF file: ${error instanceof Error ? error.message : String(error)}`));
            }
        });
    }

    /**
     * Xử lý file PDF sử dụng pdf-parse
     */
    async processPDF2(buffer: Buffer): Promise<string> {
        try {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            const text = result.text.trim();

            if (!text || text.length === 0) {
                throw new Error('No text content extracted from PDF');
            }

            console.log(`Successfully extracted ${text.length} characters from PDF`);
            await parser.destroy();
            return text;
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw new Error(`Failed to process PDF file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Xử lý file DOCX
     */
    async processDOCX(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            console.error('Error processing DOCX:', error);
            throw new Error('Failed to process DOCX file');
        }
    }

    /**
     * Xử lý file TXT
     */
    async processTXT(buffer: Buffer): Promise<string> {
        try {
            return buffer.toString('utf-8');
        } catch (error) {
            console.error('Error processing TXT:', error);
            throw new Error('Failed to process TXT file');
        }
    }

    /**
     * Xử lý file dựa trên format
     * @param buffer - Buffer của file
     * @param fileFormat - Định dạng file
     * @param isConversation - True nếu đang xử lý trong hội thoại (dùng pdf-parse), false nếu bình thường (dùng pdf2json)
     */
    async processFile(buffer: Buffer, fileFormat: string, isConversation: boolean = false): Promise<string> {
        const format = fileFormat.toLowerCase();

        switch (format) {
            case 'pdf':
            case 'application/pdf':
                return isConversation ? this.processPDF2(buffer) : this.processPDF(buffer);

            case 'docx':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return this.processDOCX(buffer);

            case 'txt':
            case 'text/plain':
                return this.processTXT(buffer);

            default:
                throw new Error(`Unsupported file format: ${fileFormat}`);
        }
    }

    /**
     * Download file từ URL
     */
    async downloadFile(url: string): Promise<Buffer> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }
}

export const fileProcessorService = new FileProcessorService();