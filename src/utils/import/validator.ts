import { z } from 'zod';
import { MappedMeinData, ValidationResult } from './types';

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
      const errorMessages = result.error.issues.map(e => e.message).join(', ');
      errors.push(`Wiersz ${i + 1}: ${errorMessages}`);
      continue;
    }

    // Walidacja biznesowa
    if (row.godziny_tygodniowo_min && row.godziny_tygodniowo_max) {
      if (row.godziny_tygodniowo_min > row.godziny_tygodniowo_max) {
        errors.push(`Wiersz ${i + 1}: Minimalne godziny tygodniowo (${row.godziny_tygodniowo_min}) są większe od maksymalnych (${row.godziny_tygodniowo_max})`);
      }
    }

    // Ostrzeżenia
    if (row.godziny_w_cyklu === 0) {
      warnings.push(`Wiersz ${i + 1}: 0 godzin w cyklu - sprawdź poprawność danych`);
    }

    if (row.godziny_w_cyklu > 1000) {
      warnings.push(`Wiersz ${i + 1}: Bardzo duża liczba godzin w cyklu (${row.godziny_w_cyklu}) - sprawdź poprawność`);
    }

    // Sprawdź daty
    if (row.data_obowiazywania_do) {
      const dataOd = new Date(row.data_obowiazywania_od);
      const dataDo = new Date(row.data_obowiazywania_do);
      if (dataDo < dataOd) {
        errors.push(`Wiersz ${i + 1}: Data obowiązywania do jest wcześniejsza niż data od`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
