/** Typy współdzielone przez Panel admina i jego sekcje. */

export interface TypSzkoly {
  id: string | number;
  nazwa: string;
  liczba_lat?: number;
  kod_mein?: string;
}

export interface Przedmiot {
  id: string | number;
  nazwa: string;
  kod_mein?: string;
  typ_zajec: string;
  poziom: string;
  aktywny?: boolean;
}

export interface KlasaAdmin {
  id: string | number;
  nazwa: string;
  rok_szkolny: string;
  profil: string | null;
  typ_szkoly: { id: string; nazwa?: string } | null;
  /** true = tylko to konto może edytować/usunąć klasę */
  can_manage?: boolean;
}

export interface NauczycielAdmin {
  id: string | number;
  imie: string;
  nazwisko: string;
  max_obciazenie?: number;
  przedmioty: Array<{ id: string | number; nazwa?: string }>;
}
