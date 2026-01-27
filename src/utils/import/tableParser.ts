import { PdfExtractionResult, ParsedTableRow } from './types';

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
  const tableRegex = /(?:Przedmiot|Lp\.|Nazwa przedmiotu)\s+(?:Typ szkoły|Klasa|Rok)\s+(?:Godziny w cyklu|Godz\. w cyklu|Godz\. cyklu)\s*(?:Godz\. tyg\.|Godziny tygodniowo|Tygodniowo)?/i;
  
  // Znajdź początek tabeli
  const tableMatch = text.match(tableRegex);
  if (!tableMatch) {
    // Spróbuj znaleźć tabelę w inny sposób
    const alternativeRegex = /(?:Ramowy plan|Siatka godzin|Plan nauczania)/i;
    const altMatch = text.match(alternativeRegex);
    
    if (!altMatch) {
      throw new Error('Nie znaleziono tabeli siatki godzin w PDF. Sprawdź format pliku.');
    }
    
    // Kontynuuj parsowanie od znalezionego miejsca
    const tableStartIndex = altMatch.index!;
    return parseTableFromPosition(text.substring(tableStartIndex));
  }

  const tableStartIndex = tableMatch.index!;
  return parseTableFromPosition(text.substring(tableStartIndex));
}

/**
 * Parsuje tabelę od określonej pozycji w tekście
 */
function parseTableFromPosition(tableText: string): ParsedTableRow[] {
  const rows: ParsedTableRow[] = [];
  
  // Podziel tekst na linie
  const lines = tableText.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  // Znajdź nagłówek tabeli
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/(?:Przedmiot|Nazwa).*?(?:Godziny|Godz\.)/i)) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error('Nie znaleziono nagłówka tabeli');
  }
  
  // Parsuj wiersze danych (zaczynając od linii po nagłówku)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Pomiń puste linie i separatory
    if (!line || line.match(/^[-=]+$/) || line.match(/^Lp\./i)) {
      continue;
    }
    
    // Próba parsowania wiersza
    const row = parseTableRow(line);
    if (row) {
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Parsuje pojedynczy wiersz tabeli
 * Obsługuje różne formaty:
 * - "Język polski | Liceum | 1-4 | 360 | 4, 4, 4, 4"
 * - "Język polski\tLiceum\t1-4\t360\t4, 4, 4, 4"
 * - "Język polski  Liceum  1-4  360  4 4 4 4"
 */
function parseTableRow(line: string): ParsedTableRow | null {
  // Normalizuj separatory (zamień różne separatory na tab)
  const normalized = line
    .replace(/\s*\|\s*/g, '\t')
    .replace(/\s{2,}/g, '\t');
  
  const parts = normalized.split('\t').map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length < 2) {
    return null; // Za mało danych
  }
  
  // Próba identyfikacji kolumn
  // Format może być różny, więc próbujemy różne kombinacje
  let przedmiot = parts[0];
  let typSzkoly: string | undefined;
  let klasaRange: string | undefined;
  let godzinyWCyklu: number | undefined;
  let rozkladStr: string | undefined;
  
  // Szukaj liczby godzin (cyfry)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Jeśli to liczba, może być godzinami w cyklu
    const numMatch = part.match(/^(\d+)$/);
    if (numMatch && !godzinyWCyklu) {
      godzinyWCyklu = parseInt(numMatch[1]);
      continue;
    }
    
    // Jeśli zawiera zakres klas (np. "1-4", "I-IV")
    if (part.match(/^[\dIVX]+-[\dIVX]+$/i)) {
      klasaRange = part;
      continue;
    }
    
    // Jeśli zawiera rozkład godzin (np. "4, 4, 4, 4" lub "4 4 4 4")
    if (part.match(/^[\d,\s]+$/)) {
      rozkladStr = part;
      continue;
    }
    
    // Jeśli to nie liczba, może być typem szkoły
    if (!typSzkoly && part.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/)) {
      typSzkoly = part;
    }
  }
  
  if (!godzinyWCyklu) {
    return null; // Brak wymaganych danych
  }
  
  // Parsuj zakres klas
  let klasa: number | undefined;
  if (klasaRange) {
    const klasaMatch = klasaRange.match(/(\d+)/);
    if (klasaMatch) {
      klasa = parseInt(klasaMatch[1]);
    }
    // Jeśli zakres (np. "1-4"), klasa = null oznacza cały cykl
    if (klasaRange.includes('-')) {
      klasa = undefined; // Cały cykl
    }
  }
  
  // Parsuj rozkład godzin tygodniowo
  let rozklad: number[] | undefined;
  if (rozkladStr) {
    rozklad = rozkladStr
      .split(/[,\s]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));
  }
  
  // Określ poziom (podstawowy/rozszerzony)
  const poziom = przedmiot.toLowerCase().includes('rozszerzony') 
    ? 'rozszerzony' as const
    : 'podstawowy' as const;
  
  // Określ typ zajęć (na podstawie nazwy przedmiotu)
  let typZajec: 'ogolnoksztalcace' | 'zawodowe_teoretyczne' | 'zawodowe_praktyczne' | undefined;
  const przedmiotLower = przedmiot.toLowerCase();
  if (przedmiotLower.includes('praktyczn') || przedmiotLower.includes('praktyka')) {
    typZajec = 'zawodowe_praktyczne';
  } else if (przedmiotLower.includes('zawodow') || przedmiotLower.includes('specjalizacja')) {
    typZajec = 'zawodowe_teoretyczne';
  } else {
    typZajec = 'ogolnoksztalcace';
  }
  
  return {
    przedmiot: przedmiot.trim(),
    typSzkoly: typSzkoly?.trim(),
    klasa,
    godzinyWCyklu,
    godzinyTygodniowo: rozklad ? {
      min: Math.min(...rozklad),
      max: Math.max(...rozklad),
      rozklad,
    } : undefined,
    obowiazkowe: true, // Domyślnie obowiązkowe
    poziom,
    typZajec,
  };
}
