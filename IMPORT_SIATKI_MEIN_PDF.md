# Import siatki godzin MEiN z pliku PDF przy użyciu OCR

## 1. Przegląd procesu

Proces importu siatki godzin MEiN z pliku PDF składa się z następujących etapów:

1. **Przygotowanie pliku PDF** - wgranie pliku przez użytkownika
2. **Ekstrakcja tekstu z PDF** - konwersja PDF do tekstu (z OCR dla skanów)
3. **Parsowanie tabel** - identyfikacja i ekstrakcja danych z tabel
4. **Mapowanie danych** - transformacja danych do struktury bazy danych
5. **Walidacja** - sprawdzenie poprawności danych
6. **Zapis do bazy** - import danych do kolekcji `siatki-godzin-mein`

---

## 2. Architektura rozwiązania

### 2.1. Stack technologiczny

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)               │
│  - Upload komponent (drag & drop)        │
│  - Progress indicator                    │
│  - Preview/edytor danych                 │
└──────────────┬────────────────────────────┘
               │
               │ HTTP POST (multipart/form-data)
               │
┌──────────────▼────────────────────────────┐
│      API Route (/api/import/mein-pdf)    │
│  - Odbiera plik PDF                      │
│  - Wywołuje pipeline przetwarzania      │
└──────────────┬────────────────────────────┘
               │
               │
┌──────────────▼────────────────────────────┐
│      Pipeline przetwarzania             │
│  1. pdf-parse (ekstrakcja tekstu)       │
│  2. Tesseract.js (OCR dla skanów)       │
│  3. Parser tabel (regex/ML)             │
│  4. Mapper danych                        │
│  5. Walidator                            │
└──────────────┬────────────────────────────┘
               │
               │
┌──────────────▼────────────────────────────┐
│      Payload CMS                         │
│  - Kolekcja: siatki-godzin-mein         │
│  - Relacje: przedmioty, typy-szkol      │
└──────────────────────────────────────────┘
```

### 2.2. Biblioteki

#### Ekstrakcja tekstu z PDF
- **`pdf-parse`** - ekstrakcja tekstu z PDF (dla PDF z tekstem)
- **`pdfjs-dist`** - alternatywa (Mozilla PDF.js)

#### OCR (dla skanów)
- **`tesseract.js`** - OCR w przeglądarce/Node.js
- **`pdf-poppler`** - konwersja PDF do obrazów (opcjonalnie)

#### Parsowanie tabel
- **`pdf-table-extractor`** - ekstrakcja tabel z PDF
- **Regex** - parsowanie tekstu po ekstrakcji
- **Custom parser** - dedykowany parser dla formatu MEiN

#### Walidacja
- **`zod`** - walidacja schematów TypeScript
- **Custom validators** - walidacja biznesowa

---

## 3. Szczegółowy proces importu

### 3.1. Etap 1: Przygotowanie i wgranie pliku

#### Frontend - Komponent uploadu

```typescript
// src/components/import/ImportMeinPdf.tsx
'use client';

import { useState } from 'react';

export default function ImportMeinPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('options', JSON.stringify({
      useOCR: true, // Włącz OCR dla skanów
      typSzkolyId: selectedTypSzkolyId,
      rokSzkolny: selectedRokSzkolny,
    }));

    setStatus('uploading');
    
    try {
      const response = await fetch('/api/import/mein-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setStatus('success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setStatus('error');
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Import siatki godzin MEiN z PDF</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Importuj
        </button>
      </div>

      {status === 'uploading' && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Przetwarzanie pliku...</p>
        </div>
      )}

      {results && (
        <div className="mt-4">
          <h3 className="font-semibold">Wyniki importu:</h3>
          <p>Zaimportowano: {results.imported} rekordów</p>
          <p>Błędów: {results.errors.length}</p>
        </div>
      )}
    </div>
  );
}
```

### 3.2. Etap 2: API Route - Odbieranie pliku

```typescript
// src/app/api/import/mein-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { processPdfImport } from '@/utils/import/meinPdfProcessor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const optionsJson = formData.get('options') as string;
    const options = JSON.parse(optionsJson || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'Brak pliku PDF' },
        { status: 400 }
      );
    }

    // Zapisz plik tymczasowo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(process.cwd(), 'temp', `import-${Date.now()}.pdf`);
    
    await writeFile(tempPath, buffer);

    try {
      // Przetwórz plik
      const result = await processPdfImport(tempPath, options);

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        warnings: result.warnings,
        preview: result.preview, // Podgląd przed zapisem
      });
    } finally {
      // Usuń plik tymczasowy
      await unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    console.error('Błąd importu PDF:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        success: false,
      },
      { status: 500 }
    );
  }
}
```

### 3.3. Etap 3: Ekstrakcja tekstu z PDF

```typescript
// src/utils/import/pdfExtractor.ts
import pdfParse from 'pdf-parse';
import { readFileSync } from 'fs';
import Tesseract from 'tesseract.js';

export interface PdfExtractionResult {
  text: string;
  pages: string[];
  hasText: boolean; // Czy PDF zawiera tekst (nie jest skanem)
}

/**
 * Ekstrahuje tekst z PDF
 * Jeśli PDF nie zawiera tekstu (skan), używa OCR
 */
export async function extractTextFromPdf(
  pdfPath: string,
  useOCR: boolean = true
): Promise<PdfExtractionResult> {
  const buffer = readFileSync(pdfPath);
  
  try {
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
 */
async function extractTextWithOCR(pdfPath: string): Promise<PdfExtractionResult> {
  // Konwersja PDF do obrazów (wymaga pdf-poppler lub podobnego)
  // Dla uproszczenia, zakładamy że mamy już obrazy stron
  
  // TODO: Implementacja konwersji PDF -> obrazy
  // Można użyć: pdf-poppler, pdf2pic, lub podobne
  
  // Przykład użycia Tesseract.js dla pojedynczego obrazu
  const { data: { text } } = await Tesseract.recognize(
    pdfPath, // W rzeczywistości: ścieżka do obrazu strony
    'pol', // Język: polski
    {
      logger: (m) => console.log(m), // Progress logging
    }
  );

  return {
    text,
    pages: [text], // Dla uproszczenia - jedna strona
    hasText: false,
  };
}
```

### 3.4. Etap 4: Parsowanie tabel z tekstu

```typescript
// src/utils/import/tableParser.ts
import { PdfExtractionResult } from './pdfExtractor';

export interface ParsedTableRow {
  przedmiot: string;
  typSzkoly?: string;
  klasa?: number;
  godzinyWCyklu: number;
  godzinyTygodniowo?: {
    min?: number;
    max?: number;
    rozklad?: number[]; // Rozkład godzin na poszczególne klasy
  };
  obowiazkowe: boolean;
  poziom?: 'podstawowy' | 'rozszerzony';
  typZajec?: 'ogolnoksztalcace' | 'zawodowe_teoretyczne' | 'zawodowe_praktyczne';
}

/**
 * Parsuje tekst z PDF i ekstrahuje dane tabeli siatki godzin
 */
export function parseMeinTable(
  extractionResult: PdfExtractionResult
): ParsedTableRow[] {
  const { text, pages } = extractionResult;
  const rows: ParsedTableRow[] = [];

  // Strategia parsowania:
  // 1. Znajdź sekcję z tabelą (np. "Ramowy plan nauczania")
  // 2. Parsuj wiersze tabeli
  // 3. Mapuj kolumny do struktury danych

  // Przykład: Regex dla typowego formatu tabeli MEiN
  const tableRegex = /(?:Przedmiot|Lp\.)\s+(?:Typ szkoły|Klasa)\s+(?:Godziny w cyklu|Godz\. w cyklu)\s*(?:Godz\. tyg\.|Godziny tygodniowo)?/i;
  
  // Znajdź początek tabeli
  const tableMatch = text.match(tableRegex);
  if (!tableMatch) {
    throw new Error('Nie znaleziono tabeli siatki godzin w PDF');
  }

  const tableStartIndex = tableMatch.index!;
  const tableText = text.substring(tableStartIndex);

  // Parsuj wiersze tabeli
  // Format przykładowy:
  // "Język polski | Liceum | 1-4 | 360 | 4, 4, 4, 4"
  // "Matematyka | Liceum | 1-4 | 360 | 4, 4, 4, 4"
  
  const rowRegex = /([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+)\s+\|\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+)?\s*\|\s*(\d+(?:-\d+)?)?\s*\|\s*(\d+)\s*(?:\|\s*([\d,\s]+))?/g;
  
  let match;
  while ((match = rowRegex.exec(tableText)) !== null) {
    const [, przedmiot, typSzkoly, klasaRange, godzinyWCyklu, rozkladStr] = match;
    
    // Parsuj zakres klas (np. "1-4" -> klasa: null, oznacza cały cykl)
    let klasa: number | undefined;
    if (klasaRange) {
      const klasaMatch = klasaRange.match(/(\d+)/);
      if (klasaMatch) {
        klasa = parseInt(klasaMatch[1]);
      }
    }

    // Parsuj rozkład godzin tygodniowo
    let rozklad: number[] | undefined;
    if (rozkladStr) {
      rozklad = rozkladStr.split(',').map(s => parseFloat(s.trim()));
    }

    rows.push({
      przedmiot: przedmiot.trim(),
      typSzkoly: typSzkoly?.trim(),
      klasa,
      godzinyWCyklu: parseInt(godzinyWCyklu),
      godzinyTygodniowo: rozklad ? {
        min: Math.min(...rozklad),
        max: Math.max(...rozklad),
        rozklad,
      } : undefined,
      obowiazkowe: true, // Domyślnie obowiązkowe
      poziom: przedmiot.toLowerCase().includes('rozszerzony') ? 'rozszerzony' : 'podstawowy',
    });
  }

  return rows;
}
```

### 3.5. Etap 5: Mapowanie danych do struktury bazy

```typescript
// src/utils/import/dataMapper.ts
import { getPayload } from 'payload';
import config from '@/payload.config';
import { ParsedTableRow } from './tableParser';

export interface MappedMeinData {
  przedmiotId: string;
  typSzkolyId: string;
  klasa?: number;
  godziny_w_cyklu: number;
  godziny_tygodniowo_min?: number;
  godziny_tygodniowo_max?: number;
  obowiazkowe: boolean;
  data_obowiazywania_od: string;
  data_obowiazywania_do?: string;
}

/**
 * Mapuje sparsowane dane do struktury bazy danych
 * Wyszukuje przedmioty i typy szkół w bazie
 */
export async function mapToDatabaseStructure(
  parsedRows: ParsedTableRow[],
  defaultTypSzkolyId?: string,
  defaultRokSzkolny?: string
): Promise<MappedMeinData[]> {
  const payload = await getPayload({ config });
  const mapped: MappedMeinData[] = [];

  // Pobierz wszystkie przedmioty i typy szkół do cache
  const [przedmioty, typySzkol] = await Promise.all([
    payload.find({ collection: 'przedmioty', limit: 1000 }),
    payload.find({ collection: 'typy-szkol', limit: 100 }),
  ]);

  const przedmiotyMap = new Map(
    przedmioty.docs.map(p => [p.nazwa.toLowerCase(), p.id])
  );
  const typySzkolMap = new Map(
    typySzkol.docs.map(t => [t.nazwa.toLowerCase(), t.id])
  );

  for (const row of parsedRows) {
    // Znajdź przedmiot w bazie (po nazwie)
    const przedmiotId = przedmiotyMap.get(row.przedmiot.toLowerCase());
    if (!przedmiotId) {
      console.warn(`Nie znaleziono przedmiotu: ${row.przedmiot}`);
      // Opcjonalnie: utwórz nowy przedmiot
      // await createPrzedmiot(row.przedmiot);
      continue;
    }

    // Znajdź typ szkoły
    let typSzkolyId = defaultTypSzkolyId;
    if (row.typSzkoly) {
      typSzkolyId = typySzkolMap.get(row.typSzkoly.toLowerCase());
    }
    if (!typSzkolyId) {
      console.warn(`Nie znaleziono typu szkoły: ${row.typSzkoly || 'domyślny'}`);
      continue;
    }

    // Mapuj dane
    mapped.push({
      przedmiotId,
      typSzkolyId,
      klasa: row.klasa,
      godziny_w_cyklu: row.godzinyWCyklu,
      godziny_tygodniowo_min: row.godzinyTygodniowo?.min,
      godziny_tygodniowo_max: row.godzinyTygodniowo?.max,
      obowiazkowe: row.obowiazkowe,
      data_obowiazywania_od: new Date().toISOString().split('T')[0], // Dziś
      data_obowiazywania_do: undefined,
    });
  }

  return mapped;
}
```

### 3.6. Etap 6: Walidacja danych

```typescript
// src/utils/import/validator.ts
import { z } from 'zod';
import { MappedMeinData } from './dataMapper';

const MeinDataSchema = z.object({
  przedmiotId: z.string().uuid(),
  typSzkolyId: z.string().uuid(),
  klasa: z.number().int().min(1).max(8).optional(),
  godziny_w_cyklu: z.number().int().min(0),
  godziny_tygodniowo_min: z.number().min(0).optional(),
  godziny_tygodniowo_max: z.number().min(0).optional(),
  obowiazkowe: z.boolean(),
  data_obowiazywania_od: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_obowiazywania_do: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Waliduje dane przed zapisem do bazy
 */
export function validateMeinData(data: MappedMeinData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Walidacja schematu
    const result = MeinDataSchema.safeParse(row);
    if (!result.success) {
      errors.push(`Wiersz ${i + 1}: ${result.error.message}`);
      continue;
    }

    // Walidacja biznesowa
    if (row.godziny_tygodniowo_min && row.godziny_tygodniowo_max) {
      if (row.godziny_tygodniowo_min > row.godziny_tygodniowo_max) {
        errors.push(`Wiersz ${i + 1}: Min > Max godzin tygodniowo`);
      }
    }

    // Ostrzeżenia
    if (row.godziny_w_cyklu === 0) {
      warnings.push(`Wiersz ${i + 1}: 0 godzin w cyklu - sprawdź poprawność`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### 3.7. Etap 7: Główny procesor importu

```typescript
// src/utils/import/meinPdfProcessor.ts
import { extractTextFromPdf } from './pdfExtractor';
import { parseMeinTable } from './tableParser';
import { mapToDatabaseStructure } from './dataMapper';
import { validateMeinData } from './validator';
import { getPayload } from 'payload';
import config from '@/payload.config';

export interface ImportOptions {
  useOCR?: boolean;
  typSzkolyId?: string;
  rokSzkolny?: string;
  autoSave?: boolean; // Czy automatycznie zapisać do bazy
}

export interface ImportResult {
  imported: number;
  errors: string[];
  warnings: string[];
  preview: any[]; // Podgląd danych przed zapisem
}

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

    // 3. Mapowanie do struktury bazy
    console.log('Mapowanie danych...');
    const mappedData = await mapToDatabaseStructure(
      parsedRows,
      typSzkolyId,
      rokSzkolny
    );

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
```

---

## 4. Mapowanie danych - szczegóły

### 4.1. Struktura tabeli w PDF MEiN

Typowa tabela w PDF MEiN ma następującą strukturę:

```
┌─────────────────────┬──────────────┬──────────┬──────────────┬──────────────────┐
│ Przedmiot           │ Typ szkoły   │ Klasa    │ Godz. w cyklu│ Godz. tygodniowo │
├─────────────────────┼──────────────┼──────────┼──────────────┼──────────────────┤
│ Język polski        │ Liceum       │ 1-4      │ 360          │ 4, 4, 4, 4       │
│ Matematyka          │ Liceum       │ 1-4      │ 360          │ 4, 4, 4, 4       │
│ Historia            │ Liceum       │ 1-4      │ 60           │ 2, 2, 0, 0       │
└─────────────────────┴──────────────┴──────────┴──────────────┴──────────────────┘
```

### 4.2. Mapowanie kolumn

| Kolumna PDF | Pole w bazie | Typ | Uwagi |
|-------------|--------------|-----|-------|
| Przedmiot | `przedmiot` (relationship) | UUID | Wyszukiwanie po nazwie |
| Typ szkoły | `typ_szkoly` (relationship) | UUID | Wyszukiwanie po nazwie/kodzie |
| Klasa | `klasa` | INTEGER \| NULL | `NULL` = cały cykl |
| Godz. w cyklu | `godziny_w_cyklu` | INTEGER | Suma godzin w całym cyklu |
| Godz. tygodniowo | `godziny_tygodniowo_min/max` | DECIMAL | Min/Max z rozkładu |

### 4.3. Rozpoznawanie przedmiotów

Przedmioty są wyszukiwane w bazie po nazwie (case-insensitive). Jeśli przedmiot nie istnieje:

**Opcja 1**: Pomiń z ostrzeżeniem
**Opcja 2**: Utwórz automatycznie (wymaga dodatkowej konfiguracji)

### 4.4. Rozpoznawanie typów szkół

Typy szkół są wyszukiwane po:
- Nazwie (np. "Liceum ogólnokształcące")
- Kodzie MEiN (np. "LO")
- Można podać domyślny typ szkoły w opcjach importu

---

## 5. Obsługa błędów

### 5.1. Typy błędów

1. **Błędy ekstrakcji PDF**
   - PDF uszkodzony
   - PDF zabezpieczony hasłem
   - Brak tekstu i OCR nie działa

2. **Błędy parsowania**
   - Nie znaleziono tabeli
   - Nieprawidłowy format tabeli
   - Brakujące kolumny

3. **Błędy mapowania**
   - Przedmiot nie znaleziony w bazie
   - Typ szkoły nie znaleziony
   - Nieprawidłowe relacje

4. **Błędy walidacji**
   - Nieprawidłowe wartości (ujemne, za duże)
   - Konflikty danych (min > max)
   - Brakujące wymagane pola

### 5.2. Strategia obsługi

```typescript
// Przykład obsługi błędów
try {
  const result = await processPdfImport(pdfPath, options);
  
  if (result.errors.length > 0) {
    // Pokaż błędy użytkownikowi
    // Pozwól na ręczną korektę
    // Zapisz tylko poprawne rekordy
  }
  
  if (result.warnings.length > 0) {
    // Pokaż ostrzeżenia
    // Pozwól użytkownikowi zdecydować
  }
} catch (error) {
  // Błąd krytyczny - przerwij import
  console.error('Błąd krytyczny:', error);
}
```

---

## 6. Interfejs użytkownika

### 6.1. Ekran importu

1. **Upload pliku**
   - Drag & drop
   - Wybór pliku
   - Podgląd nazwy pliku

2. **Opcje importu**
   - Typ szkoły (dropdown)
   - Rok szkolny
   - Włącz OCR (checkbox)
   - Automatyczny zapis (checkbox)

3. **Progress**
   - Pasek postępu
   - Status (ekstrakcja, parsowanie, mapowanie, zapis)

4. **Podgląd danych**
   - Tabela z danymi przed zapisem
   - Możliwość edycji
   - Filtrowanie błędów/ostrzeżeń

5. **Wyniki**
   - Liczba zaimportowanych rekordów
   - Lista błędów
   - Lista ostrzeżeń
   - Przycisk "Zapisz" / "Anuluj"

### 6.2. Edytor danych

Po zaimportowaniu, użytkownik może:
- Edytować poszczególne rekordy
- Usunąć nieprawidłowe rekordy
- Dodać brakujące dane ręcznie
- Eksportować do XLS

---

## 7. Instalacja zależności

```bash
npm install pdf-parse tesseract.js zod
npm install --save-dev @types/pdf-parse
```

### Alternatywne biblioteki

- **pdfjs-dist** - zamiast pdf-parse (Mozilla PDF.js)
- **pdf-table-extractor** - dedykowana ekstrakcja tabel
- **pdf-poppler** - konwersja PDF do obrazów (dla OCR)

---

## 8. Uwagi implementacyjne

### 8.1. Wydajność

- **Duże pliki PDF**: Przetwarzaj strona po stronie
- **OCR**: Może być wolne - pokazuj progress
- **Batch insert**: Zapisuj rekordy w partiach (np. 100 na raz)

### 8.2. Bezpieczeństwo

- **Walidacja plików**: Sprawdź rozszerzenie, MIME type, rozmiar
- **Sanityzacja danych**: Oczyść dane przed zapisem
- **Rate limiting**: Ogranicz liczbę importów na użytkownika

### 8.3. Testowanie

- **Testy jednostkowe**: Dla każdego etapu (ekstrakcja, parsowanie, mapowanie)
- **Testy integracyjne**: Cały pipeline importu
- **Testy z przykładowymi PDF**: Różne formaty tabel MEiN

---

## 9. Przykładowy przepływ użytkownika

1. Użytkownik wchodzi na `/admin/import/mein-pdf`
2. Wybiera plik PDF z siatką godzin MEiN
3. Wybiera typ szkoły z listy
4. Kliknie "Importuj"
5. System:
   - Ekstrahuje tekst (lub używa OCR)
   - Parsuje tabelę
   - Mapuje dane
   - Waliduje
   - Pokazuje podgląd
6. Użytkownik przegląda dane, poprawia błędy
7. Kliknie "Zapisz" - dane trafiają do bazy
8. System pokazuje podsumowanie (X rekordów zaimportowanych)

---

## 10. Następne kroki

Po implementacji podstawowego importu:

1. **Ulepszenia OCR**: Lepsze rozpoznawanie tabel
2. **Machine Learning**: Automatyczne rozpoznawanie struktury tabel
3. **Weryfikacja**: Porównanie z istniejącymi danymi
4. **Historia importów**: Logowanie wszystkich importów
5. **Rollback**: Możliwość cofnięcia importu

---

**Status**: Dokumentacja gotowa. Gotowy do implementacji. 🚀
