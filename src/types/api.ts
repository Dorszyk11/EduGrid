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
