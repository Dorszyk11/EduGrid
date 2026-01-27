export interface PdfExtractionResult {
  text: string;
  pages: string[];
  hasText: boolean; // Czy PDF zawiera tekst (nie jest skanem)
}

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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

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
  preview: MappedMeinData[]; // Podgląd danych przed zapisem
}
