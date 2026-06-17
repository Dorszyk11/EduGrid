/**
 * Typy odpowiedzi API — kształty, które trasy REALNIE zwracają (zmapowane,
 * nie surowe kolekcje Payload). Współdzielone między stronami i testami.
 * Kanoniczne źródło dla raportów; typy stron-szczegółów dochodzą w SP2 przy podpinaniu.
 */

export type StatusZgodnosci = 'OK' | 'BRAK' | 'NADWYŻKA';

/** GET /api/dashboard/zgodnosc-mein */
export interface RaportZgodnoscMein {
  wyniki: Array<{
    przedmiot: { id: string; nazwa: string };
    klasa: { id: string; nazwa: string };
    wymagane: { godziny_w_cyklu: number };
    planowane: { godziny_w_cyklu: number };
    roznica: { roznica: number; procent_realizacji: number };
    status: StatusZgodnosci;
  }>;
  statystyki: {
    lacznie: number;
    zgodne: number;
    zBrakami: number;
    zNadwyzkami: number;
    sredniProcent: number;
  };
}

/** GET /api/dashboard/obciazenie-nauczycieli */
export interface RaportObciazenia {
  obciazenia: Array<{
    nauczycielId: string;
    nauczycielNazwa: string;
    aktualneObciazenie: number;
    maxObciazenie: number;
    procentWykorzystania: number;
    przypisania: number;
  }>;
  statystyki: {
    lacznie: number;
    przekroczone: number;
    pelne: number;
    niskie: number;
    srednieObciazenie: number;
  };
}

/** GET /api/dashboard/braki-kadrowe */
export interface RaportBrakiKadrowe {
  braki: Array<{
    przedmiotId: string;
    przedmiotNazwa: string;
    klasaId: string;
    klasaNazwa: string;
    godzinyTygodniowo: number;
    powod: string;
    dostepniNauczyciele: number;
    sugerowaneRozwiazania: string[];
  }>;
  statystyki: {
    lacznie: number;
    laczneGodziny: number;
    wymaganeEtaty: number;
  };
}

/** GET /api/nauczyciele/[id] */
export interface NauczycielSzczegoly {
  nauczyciel: {
    imie: string;
    nazwisko: string;
    email?: string;
    telefon?: string;
    etat?: number | string;
    max_obciazenie?: number;
  };
  podsumowanie: {
    suma_godzin_tyg: number;
    procent_obciazenia: number;
    status: string;
    roznica: number;
    liczba_klas: number;
    liczba_przedmiotow: number;
  };
  kwalifikacje: Array<{
    przedmiot: { nazwa: string };
    specjalizacja?: string;
    stopien?: string;
  }>;
  obciazenie: Array<{
    id?: string | number;
    klasa: { id: string; nazwa: string };
    przedmiot: { id: string; nazwa: string };
    rok?: number | string | null;
    godziny_tyg: number;
    rok_szkolny: string;
  }>;
}

/** GET /api/przedmioty/[id] */
export interface PrzedmiotSzczegoly {
  przedmiot: { nazwa: string; typ_zajec?: string; poziom?: string; kod_mein?: string };
  podsumowanie: { laczna_godziny: number; liczba_klas: number; liczba_nauczycieli: number };
  klasy: Array<{
    klasa: { id: string; nazwa: string; profil?: string | null };
    godziny_tyg: number;
    godziny_roczne: number;
    nauczyciele: Array<{
      id: string;
      imie: string;
      nazwisko: string;
      godziny_tyg: number;
      godziny_roczne: number;
    }>;
  }>;
}

/** GET /api/klasy/[id] */
export interface KlasaSzczegoly {
  klasa: {
    nazwa: string;
    profil?: string | null;
    rok_szkolny: string;
    typ_szkoly: { nazwa: string };
  };
}
