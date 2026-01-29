import { readFileSync } from 'fs';
import type { PdfExtractionResult } from './types';

/**
 * Ekstrahuje tekst z PDF (pdf-parse 1.x – działa w Node bez DOM)
 * Jeśli PDF nie zawiera tekstu (skan), używa OCR
 */
export async function extractTextFromPdf(
  pdfPath: string,
  useOCR: boolean = true
): Promise<PdfExtractionResult> {
  try {
    let pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    try {
      const mod = require('pdf-parse/lib/pdf-parse');
      pdfParse = typeof mod === 'function' ? mod : mod.default ?? mod;
      if (typeof pdfParse !== 'function') throw new Error('pdf-parse nie eksportuje funkcji');
    } catch (e) {
      console.error('pdf-parse load error:', e);
      throw new Error(
        'pdf-parse nie jest dostępny. Uruchom: npm install pdf-parse@1.1.1. Szczegóły: ' +
          (e instanceof Error ? e.message : String(e))
      );
    }

    const buffer = readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    const text = (data.text ?? '').trim();
    const hasText = text.length > 100;

    if (hasText) {
      let pages = text.split(/\f/).filter(Boolean);
      if (pages.length <= 1 && (data.numpages ?? 0) > 1) {
        const dzU = /Dziennik\s+Ustaw\s+[–\-]\s*\d+\s+[–\-]\s*Poz\.\s*\d+/gi;
        const indices: number[] = [];
        let m: RegExpExecArray | null;
        while ((m = dzU.exec(text)) !== null) indices.push(m.index);
        if (indices.length > 1) {
          const chunks: string[] = [];
          for (let i = 0; i < indices.length; i++) {
            const end = i + 1 < indices.length ? indices[i + 1]! : text.length;
            chunks.push(text.slice(indices[i], end));
          }
          pages = chunks;
        }
      }
      return { text, pages: pages.length ? pages : [text], hasText: true };
    } else if (useOCR) {
      // PDF nie zawiera tekstu - użyj OCR
      console.log('PDF nie zawiera tekstu, używam OCR...');
      return await extractTextWithOCR(pdfPath);
    } else {
      throw new Error('PDF nie zawiera tekstu i OCR jest wyłączone');
    }
  } catch (error) {
    console.error('Błąd ekstrakcji tekstu:', error);
    throw error;
  }
}

/**
 * Ekstrahuje tekst z PDF używając OCR (Tesseract.js)
 * UWAGA: Wymaga konwersji PDF do obrazów (można użyć pdf-poppler lub podobnego)
 */
async function extractTextWithOCR(pdfPath: string): Promise<PdfExtractionResult> {
  try {
    // Dynamiczny import Tesseract.js
    const Tesseract = await import('tesseract.js');
    
    // TODO: Konwersja PDF do obrazów
    // Dla uproszczenia, zakładamy że mamy już obrazy stron
    // W rzeczywistości potrzebujesz biblioteki do konwersji PDF -> obrazy
    // np. pdf-poppler, pdf2pic, lub użyj API zewnętrznego
    
    console.warn('OCR wymaga konwersji PDF do obrazów. Implementacja uproszczona.');
    
    // Przykład użycia Tesseract.js dla pojedynczego obrazu
    // W rzeczywistości musisz najpierw przekonwertować PDF na obrazy
    const { data: { text } } = await Tesseract.recognize(
      pdfPath, // W rzeczywistości: ścieżka do obrazu strony
      'pol', // Język: polski
      {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    return {
      text,
      pages: [text], // Dla uproszczenia - jedna strona
      hasText: false,
    };
  } catch (error) {
    console.error('Błąd OCR:', error);
    throw new Error('OCR nie jest dostępne. Zainstaluj tesseract.js: npm install tesseract.js');
  }
}
