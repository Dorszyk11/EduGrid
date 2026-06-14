/**
 * Ręcznie utrzymywane typy wierszy Payload — zastępnik za `payload-types.ts`,
 * którego generowanie jest odłożone (niezgodność CLI Payload 3.78 ↔ Next 16).
 * Trzymać zsynchronizowane z definicjami kolekcji w `src/collections`.
 */
export type Id = number | string;

/** Wartość relacji: samo id albo rozwinięty dokument (zależnie od `depth`). */
export type Ref<T = unknown> = Id | (T & { id: Id });

export interface NauczycielRow {
  id: Id;
  imie?: string;
  nazwisko?: string;
  email?: string;
  telefon?: string;
  max_obciazenie?: number;
  etat?: string;
  aktywny?: boolean;
  wlasciciel?: Id | { id: Id } | null;
  przedmioty?: Array<Ref<{ nazwa?: string }>>;
}

export interface RozkladRow {
  id: Id;
  przedmiot?: Ref<{ nazwa?: string }>;
  klasa?: Ref<{ nazwa?: string }>;
  nauczyciel?: Ref<{ imie?: string; nazwisko?: string }>;
  rok_szkolny?: string;
  rok?: string;
  godziny_tyg?: number;
  godziny_roczne?: number;
}

export interface KwalifikacjaRow {
  id: Id;
  przedmiot?: Ref<{ nazwa?: string }>;
  stopien?: string;
  specjalizacja?: string;
}
