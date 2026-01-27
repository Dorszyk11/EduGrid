import { extractTextFromPdf } from './pdfExtractor';
import { parseMeinTable } from './tableParser';
import { mapToDatabaseStructure } from './dataMapper';
import { validateMeinData } from './validator';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { ImportOptions, ImportResult, MappedMeinData } from './types';

/**
 * Główna funkcja przetwarzająca import PDF
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
    console.log('Ekstrakcja tekstu z PDF...');
    const extractionResult = await extractTextFromPdf(pdfPath, useOCR);

    // 2. Parsowanie tabeli
    console.log('Parsowanie tabeli...');
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
    console.log('Mapowanie danych...');
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

    // 5. Zapis do bazy (jeśli autoSave)
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
          validation.errors.push(`Błąd zapisu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
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
