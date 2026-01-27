import { readFileSync } from 'fs';
import type { PdfExtractionResult } from './types';

/**
 * Ekstrahuje tekst z PDF
 * Jeśli PDF nie zawiera tekstu (skan), używa OCR
 */
export async function extractTextFromPdf(
  pdfPath: string,
  useOCR: boolean = true
): Promise<PdfExtractionResult> {
  try {
    // Dynamiczny import pdf-parse (może nie być zainstalowany)
    let pdfParse: any;
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (error) {
      throw new Error('pdf-parse nie jest zainstalowany. Uruchom: npm install pdf-parse');
    }

    const buffer = readFileSync(pdfPath);
    
    // Próba ekstrakcji tekstu z PDF
    const data = await pdfParse(buffer);
    
    // Sprawdź, czy PDF zawiera tekst
    const text = data.text.trim();
    const hasText = text.length > 100; // Minimum 100 znaków = prawdopodobnie tekst

    if (hasText) {
      // PDF zawiera tekst - zwróć go
      return {
        text,
        pages: data.text.split(/\f/), // Podział na strony
        hasText: true,
      };
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
