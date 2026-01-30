/**
 * Algorytm automatycznego rozdziału godzin przedmiotów między nauczycieli
 * 
 * Funkcjonalności:
 * - Wyrównuje obciążenie między nauczycielami
 * - Wykrywa braki kadrowe
 * - Optymalizuje przypisania globalnie
 * - Uwzględnia kwalifikacje i preferencje
 */

import type { Payload } from '@/types/payload';
import {
  sprawdzDostepnoscNauczyciela,
  znajdzDostepnychNauczycieli,
  type DostepnoscNauczyciela,
} from './przypisywanieNauczycieli';

// Typy danych
export interface ZadaniePrzypisania {
  id: string; // Unikalny identyfikator zadania
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  priorytet: number; // Im wyższy, tym ważniejsze zadanie
  wymaganeKwalifikacje: boolean;
  preferowaniNauczyciele?: string[];
  wykluczeniNauczyciele?: string[];
}

export interface Przypisanie {
  zadanieId: string;
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  nauczycielId: string;
  nauczycielNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  powod: string;
  priorytet: number;
}

export interface BrakKadrowy {
  zadanieId: string;
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  powod: string;
  dostepniNauczyciele: number; // Liczba nauczycieli, którzy mogliby uczyć (ale nie mają czasu)
  sugerowaneRozwiazania: string[];
}

export interface StatystykiObciazenia {
  nauczycielId: string;
  nauczycielNazwa: string;
  maxObciazenie: number;
  przedObciazenie: number; // Przed algorytmem
  poObciazeniu: number; // Po algorytmie
  roznica: number;
  procentWykorzystania: number;
  przypisania: number; // Liczba przypisań
}

export interface WynikAutomatycznegoRozdzialu {
  przypisania: Przypisanie[];
  brakiKadrowe: BrakKadrowy[];
  statystykiObciazenia: StatystykiObciazenia[];
  metryki: {
    lacznieZadan: number;
    udanePrzypisania: number;
    nieudanePrzypisania: number;
    srednieObciazenie: number; // Średnie obciążenie wszystkich nauczycieli
    odchylenieStandardowe: number; // Odchylenie obciążeń (im mniejsze, tym lepsze wyrównanie)
    wspolczynnikWyrównania: number; // 0-1, im wyższy, tym lepsze wyrównanie
  };
  ostrzezenia: string[];
}

export interface ParametryRozdzialu {
  typSzkolyId?: string; // Jeśli podano, tylko klasy tego typu
  rokSzkolny: string;
  wymagajKwalifikacji?: boolean; // Domyślnie: true
  maksymalnePrzekroczenie?: number; // Maksymalne przekroczenie obciążenia (domyślnie: 0)
  preferujKontynuacje?: boolean; // Preferuj nauczycieli, którzy już uczą przedmiotu
  minimalneObciazenie?: number; // Minimalne obciążenie nauczyciela (opcjonalnie)
}

/**
 * Pobiera wszystkie zadania do przypisania (przedmioty w klasach)
 */
async function pobierzZadania(
  payload: Payload,
  parametry: ParametryRozdzialu
): Promise<ZadaniePrzypisania[]> {
  const { typSzkolyId, rokSzkolny } = parametry;

  // Pobierz klasy
  const warunkiKlas: any = {
    and: [
      {
        aktywna: {
          equals: true,
        },
      },
      {
        rok_szkolny: {
          equals: rokSzkolny,
        },
      },
    ],
  };

  if (typSzkolyId) {
    warunkiKlas.and.push({
      typ_szkoly: {
        equals: typSzkolyId,
      },
    });
  }

  const klasy = await payload.find({
    collection: 'klasy',
    where: warunkiKlas,
    depth: 1,
  });

  // Pobierz wymagania MEiN (aby wiedzieć, ile godzin potrzeba)
  const siatkiMein = await payload.find({
    collection: 'siatki-godzin-mein',
    where: {
      and: [
        {
          data_obowiazywania_od: {
            less_than_equal: new Date().toISOString(),
          },
        },
        {
          or: [
            {
              data_obowiazywania_do: {
                greater_than_equal: new Date().toISOString(),
              },
            },
            {
              data_obowiazywania_do: {
                equals: null,
              },
            },
          ],
        },
      ],
    },
    depth: 2,
  });

  const zadania: ZadaniePrzypisania[] = [];

  for (const klasa of klasy.docs) {
    const typSzkoly = typeof klasa.typ_szkoly === 'object' ? klasa.typ_szkoly : await payload.findByID({
      collection: 'typy-szkol',
      id: typeof klasa.typ_szkoly === 'string' ? klasa.typ_szkoly : klasa.typ_szkoly.id,
    });

    // Znajdź wymagania MEiN dla tego typu szkoły i klasy
    const wymaganiaDlaKlasy = siatkiMein.docs.filter(sm => {
      const smTypSzkoly = typeof sm.typ_szkoly === 'object' ? sm.typ_szkoly.id : sm.typ_szkoly;
      const klasaTypSzkoly = typeof klasa.typ_szkoly === 'object' ? klasa.typ_szkoly.id : klasa.typ_szkoly;
      
      return smTypSzkoly === klasaTypSzkoly && 
             (sm.klasa === null || sm.klasa === klasa.numer_klasy);
    });

    // Sprawdź, czy są już przypisania dla tej klasy
    const istniejącePrzypisania = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        and: [
          {
            klasa: {
              equals: klasa.id,
            },
          },
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
          {
            zablokowane: {
              not_equals: true, // Pomiń zablokowane przypisania
            },
          },
        ],
      },
      depth: 1,
    });

    // Dla każdego wymagania MEiN utwórz zadanie
    for (const wymaganie of wymaganiaDlaKlasy) {
      const przedmiot = typeof wymaganie.przedmiot === 'object' 
        ? wymaganie.przedmiot 
        : await payload.findByID({
            collection: 'przedmioty',
            id: typeof wymaganie.przedmiot === 'string' ? wymaganie.przedmiot : wymaganie.przedmiot.id,
          });

      if (!przedmiot || !przedmiot.aktywny) {
        continue;
      }

      // Sprawdź, czy już jest przypisanie
      const istniejące = istniejącePrzypisania.docs.find(rg => {
        const rgPrzedmiot = typeof rg.przedmiot === 'object' ? rg.przedmiot.id : rg.przedmiot;
        const wymPrzedmiot = typeof wymaganie.przedmiot === 'object' ? wymaganie.przedmiot.id : wymaganie.przedmiot;
        return rgPrzedmiot === wymPrzedmiot;
      });

      // Jeśli jest przypisanie, sprawdź czy godziny są zgodne
      if (istniejące) {
        const sumaGodzin = istniejącePrzypisania.docs
          .filter(rg => {
            const rgPrzedmiot = typeof rg.przedmiot === 'object' ? rg.przedmiot.id : rg.przedmiot;
            const wymPrzedmiot = typeof wymaganie.przedmiot === 'object' ? wymaganie.przedmiot.id : wymaganie.przedmiot;
            return rgPrzedmiot === wymPrzedmiot;
          })
          .reduce((sum, rg) => sum + (rg.godziny_tyg || 0), 0);

        // Jeśli godziny są zgodne z wymaganiami, pomiń
        if (sumaGodzin >= (wymaganie.godziny_tygodniowo_min || 0)) {
          continue;
        }
      }

      // Oblicz godziny tygodniowo (jeśli nie podano w wymaganiach, użyj średniej)
      const godzinyTygodniowo = wymaganie.godziny_tygodniowo_min || 
        (wymaganie.godziny_w_cyklu / (typSzkoly?.liczba_lat || 4) / 30); // Przybliżenie

      const godzinyRoczne = godzinyTygodniowo * 30; // Przybliżenie (30 tygodni w roku)

      zadania.push({
        id: `${klasa.id}-${przedmiot.id}`,
        przedmiotId: String(przedmiot.id),
        przedmiotNazwa: przedmiot.nazwa,
        klasaId: String(klasa.id),
        klasaNazwa: klasa.nazwa,
        godzinyTygodniowo,
        godzinyRoczne,
        priorytet: wymaganie.obowiazkowe ? 100 : 50,
        wymaganeKwalifikacje: true,
      });
    }
  }

  // Sortuj według priorytetu (wyższy = ważniejsze)
  zadania.sort((a, b) => b.priorytet - a.priorytet);

  return zadania;
}

/**
 * Główny algorytm automatycznego rozdziału godzin
 * 
 * Strategia:
 * 1. Pobierz wszystkie zadania
 * 2. Dla każdego zadania znajdź najlepszego nauczyciela
 * 3. Wyrównaj obciążenia iteracyjnie
 * 4. Wykryj braki kadrowe
 */
export async function automatycznyRozdzialGodzin(
  payload: Payload,
  parametry: ParametryRozdzialu
): Promise<WynikAutomatycznegoRozdzialu> {
  const {
    rokSzkolny,
    wymagajKwalifikacji = true,
    maksymalnePrzekroczenie = 0,
    preferujKontynuacje = true,
    minimalneObciazenie = 0,
  } = parametry;

  // KROK 1: Pobierz wszystkie zadania
  const zadania = await pobierzZadania(payload, parametry);

  // KROK 2: Pobierz wszystkich aktywnych nauczycieli
  const nauczyciele = await payload.find({
    collection: 'nauczyciele',
    where: {
      aktywny: {
        equals: true,
      },
    },
  });

  // KROK 3: Oblicz początkowe obciążenia nauczycieli
  const obciazeniaPoczatkowe = new Map<string, number>();
  for (const nauczyciel of nauczyciele.docs) {
    const rozklady = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        and: [
          {
            nauczyciel: {
              equals: nauczyciel.id,
            },
          },
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
        ],
      },
    });

    const suma = rozklady.docs.reduce((sum, r) => sum + (r.godziny_tyg || 0), 0);
    obciazeniaPoczatkowe.set(String(nauczyciel.id), suma);
  }

  // KROK 4: Przypisz zadania (algorytm greedy z optymalizacją)
  const przypisania: Przypisanie[] = [];
  const brakiKadrowe: BrakKadrowy[] = [];
  const obciazeniaAktualne = new Map(obciazeniaPoczatkowe);
  const przypisaniaNauczycieli = new Map<string, string[]>(); // nauczycielId -> lista zadanieId

  for (const zadanie of zadania) {
    // Sprawdź, czy istnieje zablokowane przypisanie dla tego zadania
    const zablokowanePrzypisanie = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        and: [
          {
            przedmiot: {
              equals: zadanie.przedmiotId,
            },
          },
          {
            klasa: {
              equals: zadanie.klasaId,
            },
          },
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
          {
            zablokowane: {
              equals: true,
            },
          },
        ],
      },
      limit: 1,
    });

    // Jeśli jest zablokowane przypisanie, pomiń to zadanie
    if (zablokowanePrzypisanie.docs.length > 0) {
      continue;
    }

    // Znajdź dostępnych nauczycieli
    const dostepni = await znajdzDostepnychNauczycieli(
      payload,
      zadanie.przedmiotId,
      rokSzkolny,
      {
        wymagajKwalifikacji,
        minimalneObciazenie: Math.max(minimalneObciazenie, zadanie.godzinyTygodniowo),
        preferowani: zadanie.preferowaniNauczyciele,
        wykluczeni: zadanie.wykluczeniNauczyciele,
      }
    );

    // Filtruj nauczycieli, którzy nie przekroczą maksimum (z tolerancją)
    const dostepniZObciazeniem = dostepni.filter(d => {
      const obecneObciazenie = obciazeniaAktualne.get(d.nauczycielId) || 0;
      const noweObciazenie = obecneObciazenie + zadanie.godzinyTygodniowo;
      return noweObciazenie <= (d.maxObciazenie + maksymalnePrzekroczenie);
    });

    if (dostepniZObciazeniem.length === 0) {
      // Brak kadrowy
      const dostepniBezObciazenia = dostepni.filter(d => {
        const obecneObciazenie = obciazeniaAktualne.get(d.nauczycielId) || 0;
        return obecneObciazenie < d.maxObciazenie;
      });

      brakiKadrowe.push({
        zadanieId: zadanie.id,
        przedmiotId: zadanie.przedmiotId,
        przedmiotNazwa: zadanie.przedmiotNazwa,
        klasaId: zadanie.klasaId,
        klasaNazwa: zadanie.klasaNazwa,
        godzinyTygodniowo: zadanie.godzinyTygodniowo,
        powod: dostepni.length === 0
          ? 'Brak nauczycieli z kwalifikacjami'
          : 'Brak nauczycieli z dostępnym obciążeniem',
        dostepniNauczyciele: dostepniBezObciazenia.length,
        sugerowaneRozwiazania: [
          dostepni.length === 0
            ? 'Dodaj kwalifikacje nauczycielom lub zatrudnij nowego nauczyciela'
            : 'Zwiększ obciążenie istniejących nauczycieli lub zatrudnij nowego',
          `Wymagane: ${zadanie.godzinyTygodniowo} godzin tygodniowo`,
        ],
      });
      continue;
    }

    // Wybierz najlepszego nauczyciela
    // Strategia: preferuj nauczycieli z niskim obciążeniem (wyrównanie)
    dostepniZObciazeniem.sort((a, b) => {
      const aObciazenie = obciazeniaAktualne.get(a.nauczycielId) || 0;
      const bObciazenie = obciazeniaAktualne.get(b.nauczycielId) || 0;
      const aProcent = (aObciazenie / a.maxObciazenie) * 100;
      const bProcent = (bObciazenie / b.maxObciazenie) * 100;

      // Preferuj kontynuację (jeśli już uczy tego przedmiotu)
      if (preferujKontynuacje) {
        const aUczy = przypisaniaNauczycieli.get(a.nauczycielId)?.some(zId => {
          const z = zadania.find(z => z.id === zId);
          return z?.przedmiotId === zadanie.przedmiotId;
        });
        const bUczy = przypisaniaNauczycieli.get(b.nauczycielId)?.some(zId => {
          const z = zadania.find(z => z.id === zId);
          return z?.przedmiotId === zadanie.przedmiotId;
        });

        if (aUczy && !bUczy) return -1;
        if (!aUczy && bUczy) return 1;
      }

      // Preferuj niższe obciążenie (wyrównanie)
      return aProcent - bProcent;
    });

    const wybrany = dostepniZObciazeniem[0];
    const obecneObciazenie = obciazeniaAktualne.get(wybrany.nauczycielId) || 0;
    const noweObciazenie = obecneObciazenie + zadanie.godzinyTygodniowo;

    // Utwórz przypisanie
    const przypisanie: Przypisanie = {
      zadanieId: zadanie.id,
      przedmiotId: zadanie.przedmiotId,
      przedmiotNazwa: zadanie.przedmiotNazwa,
      klasaId: zadanie.klasaId,
      klasaNazwa: zadanie.klasaNazwa,
      nauczycielId: wybrany.nauczycielId,
      nauczycielNazwa: wybrany.nauczycielNazwa,
      godzinyTygodniowo: zadanie.godzinyTygodniowo,
      godzinyRoczne: zadanie.godzinyRoczne,
      powod: preferujKontynuacje && przypisaniaNauczycieli.get(wybrany.nauczycielId)?.some(zId => {
        const z = zadania.find(z => z.id === zId);
        return z?.przedmiotId === zadanie.przedmiotId;
      }) ? 'Kontynuacja przedmiotu' : 'Wyrównanie obciążeń',
      priorytet: zadanie.priorytet,
    };

    przypisania.push(przypisanie);

    // Aktualizuj obciążenia
    obciazeniaAktualne.set(wybrany.nauczycielId, noweObciazenie);

    // Aktualizuj mapę przypisań
    if (!przypisaniaNauczycieli.has(wybrany.nauczycielId)) {
      przypisaniaNauczycieli.set(wybrany.nauczycielId, []);
    }
    przypisaniaNauczycieli.get(wybrany.nauczycielId)!.push(zadanie.id);
  }

  // KROK 5: Oblicz statystyki obciążeń
  const statystykiObciazenia: StatystykiObciazenia[] = [];
  for (const nauczyciel of nauczyciele.docs) {
    const nauczycielIdStr = String(nauczyciel.id);
    const przed = obciazeniaPoczatkowe.get(nauczycielIdStr) || 0;
    const po = obciazeniaAktualne.get(nauczycielIdStr) || przed;
    const max = nauczyciel.max_obciazenie || 18;
    const przypisaniaNauczyciela = przypisania.filter(p => p.nauczycielId === nauczycielIdStr);

    statystykiObciazenia.push({
      nauczycielId: nauczycielIdStr,
      nauczycielNazwa: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
      maxObciazenie: max,
      przedObciazenie: przed,
      poObciazeniu: po,
      roznica: po - przed,
      procentWykorzystania: max > 0 ? (po / max) * 100 : 0,
      przypisania: przypisaniaNauczyciela.length,
    });
  }

  // KROK 6: Oblicz metryki
  const obciazenia = Array.from(obciazeniaAktualne.values());
  const srednieObciazenie = obciazenia.length > 0
    ? obciazenia.reduce((sum, o) => sum + o, 0) / obciazenia.length
    : 0;

  const wariancja = obciazenia.length > 0
    ? obciazenia.reduce((sum, o) => sum + Math.pow(o - srednieObciazenie, 2), 0) / obciazenia.length
    : 0;
  const odchylenieStandardowe = Math.sqrt(wariancja);

  // Współczynnik wyrównania: 1 - (odchylenie / średnie) (im wyższy, tym lepsze wyrównanie)
  const wspolczynnikWyrównania = srednieObciazenie > 0
    ? Math.max(0, 1 - (odchylenieStandardowe / srednieObciazenie))
    : 0;

  // KROK 7: Generuj ostrzeżenia
  const ostrzezenia: string[] = [];
  
  const przekroczenia = statystykiObciazenia.filter(s => s.poObciazeniu > s.maxObciazenie);
  if (przekroczenia.length > 0) {
    ostrzezenia.push(
      `${przekroczenia.length} nauczycieli przekroczyło maksymalne obciążenie`
    );
  }

  const niskoObciazeni = statystykiObciazenia.filter(s => s.procentWykorzystania < 50);
  if (niskoObciazeni.length > 0) {
    ostrzezenia.push(
      `${niskoObciazeni.length} nauczycieli ma obciążenie poniżej 50%`
    );
  }

  if (brakiKadrowe.length > 0) {
    ostrzezenia.push(
      `${brakiKadrowe.length} przedmiotów nie ma przypisanych nauczycieli`
    );
  }

  return {
    przypisania,
    brakiKadrowe,
    statystykiObciazenia,
    metryki: {
      lacznieZadan: zadania.length,
      udanePrzypisania: przypisania.length,
      nieudanePrzypisania: brakiKadrowe.length,
      srednieObciazenie,
      odchylenieStandardowe,
      wspolczynnikWyrównania,
    },
    ostrzezenia,
  };
}

/**
 * Optymalizuje istniejące przypisania (przenosi godziny między nauczycielami)
 */
export async function optymalizujIstniejacePrzypisania(
  payload: Payload,
  rokSzkolny: string,
  maksymalneIteracje: number = 10
): Promise<{
  zmiany: Array<{
    od: string; // nauczycielId
    do: string; // nauczycielId
    zadanieId: string;
    powod: string;
  }>;
  poprawa: number; // Poprawa współczynnika wyrównania
}> {
  // TODO: Implementacja optymalizacji (przenoszenie godzin między nauczycielami)
  // To wymaga bardziej zaawansowanego algorytmu
  
  return {
    zmiany: [],
    poprawa: 0,
  };
}
