import * as cheerio from 'cheerio';
import * as mammoth from 'mammoth';
const pdfParse = require('pdf-parse');
import * as xlsx from 'xlsx';
import { logger } from '../utils/logger';

export class DocumentParserService {
    /**
     * Fetches a webpage and strictly extracts text content, 
     * removing scripts, styles, and other metadata.
     */
    static async parseUrl(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove non-content elements
            $('script, style, noscript, nav, header, footer, [role="navigation"]').remove();

            // Extract text from the body, replacing multiple newlines/spaces
            let rawText = $('body').text();
            rawText = rawText.replace(/\s+/g, ' ').trim();

            if (!rawText) {
                throw new Error('No readable text found on the page');
            }

            return rawText;
        } catch (error) {
            logger.error({ error, url }, 'Failed to parse URL content');
            throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extracts text content from uploaded files (PDF, DOCX, XLSX)
     */
    static async parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
        try {
            if (mimeType === 'application/pdf') {
                const data = await pdfParse(buffer);
                return data.text.trim();
            }

            if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
                const result = await mammoth.extractRawText({ buffer });
                return result.value.trim();
            }

            if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                let text = '';

                // Extract all rows from all sheets into essentially CSV-like text
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const csv = xlsx.utils.sheet_to_csv(sheet);
                    if (csv) {
                        text += `\n--- Sheet: ${sheetName} ---\n` + csv;
                    }
                });
                return text.trim();
            }

            throw new Error('Unsupported file format. Please upload PDF, Word, or Excel documents.');
        } catch (error) {
            logger.error({ error, mimeType }, 'Document parsing failed');
            throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

