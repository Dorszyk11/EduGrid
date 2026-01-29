import { extractTextFromPdf } from './pdfExtractor';
import { parseMeinTable } from './tableParser';
import { mapToDatabaseStructure } from './dataMapper';
import { validateMeinData } from './validator';

import { parseRamowyPlanyFromText } from './ramowyPlanParserText';

import { getPayload } from 'payload';
import config from '@/payload.config';

import type { ImportOptions, ImportResult, MappedMeinData } from './types';
import type { RamowyPlanParseResult } from './ramowyPlanTypes';

/**
 * =========================================================
 *  STANDARDOWY IMPORT MEiN (stare tabele, NIE ramowe plany)
 * =========================================================
 */
export async function processPdfImport(
  pdfPath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    useOCR = true,
    typSzkolyId,
    rokSzkolny = '2024/2025',
    autoSave = false,
  } = options;

  try {
    // 1. Ekstrakcja tekstu
    console.log('Ekstrakcja tekstu z PDF (MEiN)...');
    const extractionResult = await extractTextFromPdf(pdfPath, useOCR);

    // 2. Parsowanie tabeli
    console.log('Parsowanie tabel MEiN...');
    const parsedRows = parseMeinTable(extractionResult);
    console.log(`Znaleziono ${parsedRows.length} wierszy`);

    if (parsedRows.length === 0) {
      return {
        imported: 0,
        errors: ['Nie znaleziono żadnych danych w tabeli'],
        warnings: [],
        preview: [],
      };
    }

    // 3. Mapowanie do struktury bazy
    console.log('Mapowanie danych MEiN...');
    const mappedData = await mapToDatabaseStructure(
      parsedRows,
      typSzkolyId,
      rokSzkolny
    );

    console.log(`Zmapowano ${mappedData.length} rekordów`);

    // 4. Walidacja
    console.log('Walidacja danych...');
    const validation = validateMeinData(mappedData);

    if (!validation.valid) {
      return {
        imported: 0,
        errors: validation.errors,
        warnings: validation.warnings,
        preview: mappedData,
      };
    }

    // 5. Zapis do bazy (opcjonalny)
    let imported = 0;
    if (autoSave) {
      console.log('Zapisywanie do bazy...');
      const payload = await getPayload({ config });

      for (const data of mappedData) {
        try {
          await payload.create({
            collection: 'siatki-godzin-mein',
            data: {
              przedmiot: data.przedmiotId,
              typ_szkoly: data.typSzkolyId,
              klasa: data.klasa,
              godziny_w_cyklu: data.godziny_w_cyklu,
              godziny_tygodniowo_min: data.godziny_tygodniowo_min,
              godziny_tygodniowo_max: data.godziny_tygodniowo_max,
              obowiazkowe: data.obowiazkowe,
              data_obowiazywania_od: data.data_obowiazywania_od,
              data_obowiazywania_do: data.data_obowiazywania_do,
            },
          });
          imported++;
        } catch (error) {
          console.error(`Błąd zapisu rekordu:`, error);
          validation.errors.push(
            `Błąd zapisu: ${
              error instanceof Error ? error.message : 'Nieznany błąd'
            }`
          );
        }
      }
    }

    return {
      imported,
      errors: validation.errors,
      warnings: validation.warnings,
      preview: mappedData,
    };
  } catch (error) {
    console.error('Błąd przetwarzania PDF:', error);
    throw error;
  }
}

/**
 * =========================================================
 *  IMPORT RAMOWYCH PLANÓW NAUCZANIA (TYLKO "RAZEM W CYKLU")
 * =========================================================
 *
 * - extractTextFromPdf (pdf-parse 1.x) + parseRamowyPlanyFromText
 * - Działa w Node bez pdfjs-dist; unika 500 przy API
 */
export async function processRamowyPlanImport(
  pdfPath: string,
  options: { useOCR?: boolean } = {}
): Promise<RamowyPlanParseResult> {
  const useOCR = options.useOCR !== false;
  console.log('Ekstrakcja tekstu z PDF (ramowe plany)...');
  const { extractTextFromPdf } = await import('./pdfExtractor');
  const ext = await extractTextFromPdf(pdfPath, useOCR);
  console.log('Parsowanie ramowych planów (tekst)...');
  return parseRamowyPlanyFromText(ext);
}
