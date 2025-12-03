// src/services/fileProcessor.service.ts
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export class FileProcessorService {
    /**
     * Xử lý file PDF
     */
    async processPDF(buffer: Buffer): Promise<string> {
        try {
            const data = await new PDFParse(buffer);
            return (await data.getText()).text;
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw new Error('Failed to process PDF file');
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
     */
    async processFile(buffer: Buffer, fileFormat: string): Promise<string> {
        const format = fileFormat.toLowerCase();

        switch (format) {
            case 'pdf':
            case 'application/pdf':
                return this.processPDF(buffer);

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