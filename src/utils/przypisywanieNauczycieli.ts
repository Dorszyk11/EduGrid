/**
 * Logika przypisywania nauczycieli do przedmiotów
 * 
 * Uwzględnia:
 * - Kwalifikacje nauczycieli
 * - Maksymalne roczne obciążenie godzinowe
 * - Wyrównanie obciążeń między nauczycielami
 * - Optymalizacja przypisań
 */

import type { Payload } from 'payload/types';

// Typy danych
export interface DostepnoscNauczyciela {
  nauczycielId: string;
  nauczycielNazwa: string;
  maxObciazenie: number; // Godziny tygodniowo
  aktualneObciazenie: number; // Godziny tygodniowo
  dostepneObciazenie: number; // maxObciazenie - aktualneObciazenie
  maKwalifikacje: boolean;
  kwalifikacje?: {
    stopien?: string;
    specjalizacja?: string;
  };
  procentWykorzystania: number; // (aktualne / max) * 100
}

export interface PropozycjaPrzypisania {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  nauczycielId: string;
  nauczycielNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  priorytet: number; // Im wyższy, tym lepsze przypisanie
  powod: string; // Powód przypisania
  ostrzezenia: string[];
}

export interface ParametryPrzypisania {
  przedmiotId: string;
  klasaId: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  rokSzkolny: string;
  preferowaniNauczyciele?: string[]; // ID nauczycieli preferowanych
  wykluczeniNauczyciele?: string[]; // ID nauczycieli wykluczonych
  wymagajKwalifikacji?: boolean; // Czy wymagać kwalifikacji (domyślnie: true)
  minimalneObciazenie?: number; // Minimalne obciążenie nauczyciela (opcjonalnie)
}

export interface WynikPrzypisania {
  przypisanie?: PropozycjaPrzypisania;
  dostepniNauczyciele: DostepnoscNauczyciela[];
  problemy: string[];
  czyMozliwe: boolean;
}

/**
 * Sprawdza dostępność nauczyciela (obciążenie i kwalifikacje)
 */
export async function sprawdzDostepnoscNauczyciela(
  payload: Payload,
  nauczycielId: string,
  przedmiotId: string,
  rokSzkolny: string
): Promise<DostepnoscNauczyciela> {
  // Pobierz nauczyciela
  const nauczyciel = await payload.findByID({
    collection: 'nauczyciele',
    id: nauczycielId,
  });

  if (!nauczyciel || !nauczyciel.aktywny) {
    throw new Error(`Nauczyciel ${nauczycielId} nie istnieje lub nie jest aktywny`);
  }

  // Pobierz aktualne obciążenie nauczyciela
  const rozklady = await payload.find({
    collection: 'rozkład-godzin',
    where: {
      and: [
        {
          nauczyciel: {
            equals: nauczycielId,
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

  const aktualneObciazenie = rozklady.docs.reduce(
    (suma, rozklad) => suma + (rozklad.godziny_tyg || 0),
    0
  );

  const maxObciazenie = nauczyciel.max_obciazenie || 18;
  const dostepneObciazenie = Math.max(0, maxObciazenie - aktualneObciazenie);
  const procentWykorzystania = maxObciazenie > 0 
    ? (aktualneObciazenie / maxObciazenie) * 100 
    : 0;

  // Sprawdź kwalifikacje
  const kwalifikacje = await payload.find({
    collection: 'kwalifikacje',
    where: {
      and: [
        {
          nauczyciel: {
            equals: nauczycielId,
          },
        },
        {
          przedmiot: {
            equals: przedmiotId,
          },
        },
        {
          aktywne: {
            equals: true,
          },
        },
      ],
    },
    limit: 1,
  });

  const maKwalifikacje = kwalifikacje.docs.length > 0;
  const kwalifikacjeData = maKwalifikacje ? kwalifikacje.docs[0] : undefined;

  return {
    nauczycielId,
    nauczycielNazwa: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
    maxObciazenie,
    aktualneObciazenie,
    dostepneObciazenie,
    maKwalifikacje,
    kwalifikacje: kwalifikacjeData ? {
      stopien: kwalifikacjeData.stopien,
      specjalizacja: kwalifikacjeData.specjalizacja,
    } : undefined,
    procentWykorzystania,
  };
}

/**
 * Znajduje wszystkich dostępnych nauczycieli dla przedmiotu
 */
export async function znajdzDostepnychNauczycieli(
  payload: Payload,
  przedmiotId: string,
  rokSzkolny: string,
  opcje: {
    wymagajKwalifikacji?: boolean;
    minimalneObciazenie?: number;
    preferowani?: string[];
    wykluczeni?: string[];
  } = {}
): Promise<DostepnoscNauczyciela[]> {
  const {
    wymagajKwalifikacji = true,
    minimalneObciazenie = 0,
    preferowani = [],
    wykluczeni = [],
  } = opcje;

  // Pobierz wszystkich aktywnych nauczycieli
  const nauczyciele = await payload.find({
    collection: 'nauczyciele',
    where: {
      aktywny: {
        equals: true,
      },
    },
  });

  const dostepni: DostepnoscNauczyciela[] = [];

  for (const nauczyciel of nauczyciele.docs) {
    // Pomiń wykluczonych
    if (wykluczeni.includes(nauczyciel.id)) {
      continue;
    }

    try {
      const dostepnosc = await sprawdzDostepnoscNauczyciela(
        payload,
        nauczyciel.id,
        przedmiotId,
        rokSzkolny
      );

      // Sprawdź wymagania
      if (wymagajKwalifikacji && !dostepnosc.maKwalifikacje) {
        continue;
      }

      if (dostepnosc.dostepneObciazenie < minimalneObciazenie) {
        continue;
      }

      dostepni.push(dostepnosc);
    } catch (error) {
      // Pomiń nauczyciela w przypadku błędu
      console.warn(`Błąd przy sprawdzaniu nauczyciela ${nauczyciel.id}:`, error);
    }
  }

  // Sortuj: preferowani na początku, potem według dostępnego obciążenia (malejąco)
  dostepni.sort((a, b) => {
    const aPreferowany = preferowani.includes(a.nauczycielId) ? 1 : 0;
    const bPreferowany = preferowani.includes(b.nauczycielId) ? 1 : 0;

    if (aPreferowany !== bPreferowany) {
      return bPreferowany - aPreferowany;
    }

    // Sortuj według dostępnego obciążenia (więcej = lepiej)
    return b.dostepneObciazenie - a.dostepneObciazenie;
  });

  return dostepni;
}

/**
 * Proponuje przypisanie nauczyciela do przedmiotu w klasie
 * 
 * Algorytm:
 * 1. Znajdź dostępnych nauczycieli
 * 2. Wybierz najlepszego (najwięcej dostępnego obciążenia, preferowani)
 * 3. Sprawdź, czy przypisanie jest możliwe
 * 4. Zwróć propozycję z priorytetem
 */
export async function proponujPrzypisanie(
  payload: Payload,
  parametry: ParametryPrzypisania
): Promise<WynikPrzypisania> {
  const {
    przedmiotId,
    klasaId,
    godzinyTygodniowo,
    godzinyRoczne,
    rokSzkolny,
    preferowaniNauczyciele = [],
    wykluczeniNauczyciele = [],
    wymagajKwalifikacji = true,
    minimalneObciazenie = 0,
  } = parametry;

  // Pobierz dane przedmiotu i klasy
  const przedmiot = await payload.findByID({
    collection: 'przedmioty',
    id: przedmiotId,
  });

  const klasa = await payload.findByID({
    collection: 'klasy',
    id: klasaId,
  });

  if (!przedmiot || !klasa) {
    return {
      dostepniNauczyciele: [],
      problemy: ['Przedmiot lub klasa nie istnieje'],
      czyMozliwe: false,
    };
  }

  // Znajdź dostępnych nauczycieli
  const dostepni = await znajdzDostepnychNauczycieli(
    payload,
    przedmiotId,
    rokSzkolny,
    {
      wymagajKwalifikacji,
      minimalneObciazenie: Math.max(minimalneObciazenie, godzinyTygodniowo),
      preferowani: preferowaniNauczyciele,
      wykluczeni: wykluczeniNauczyciele,
    }
  );

  if (dostepni.length === 0) {
    return {
      dostepniNauczyciele: [],
      problemy: [
        wymagajKwalifikacji 
          ? 'Brak nauczycieli z kwalifikacjami do tego przedmiotu'
          : 'Brak dostępnych nauczycieli',
        `Wymagane: ${godzinyTygodniowo} godzin tygodniowo`,
      ],
      czyMozliwe: false,
    };
  }

  // Wybierz najlepszego nauczyciela
  const wybrany = dostepni[0];
  const noweObciazenie = wybrany.aktualneObciazenie + godzinyTygodniowo;

  // Sprawdź, czy nie przekracza maksimum
  const ostrzezenia: string[] = [];
  let priorytet = 100;

  if (noweObciazenie > wybrany.maxObciazenie) {
    ostrzezenia.push(
      `Przypisanie spowoduje przekroczenie maksymalnego obciążenia (${noweObciazenie} > ${wybrany.maxObciazenie})`
    );
    priorytet -= 50;
  } else if (noweObciazenie === wybrany.maxObciazenie) {
    ostrzezenia.push('Nauczyciel osiągnie maksymalne obciążenie');
    priorytet -= 20;
  }

  // Bonus za preferowanego nauczyciela
  if (preferowaniNauczyciele.includes(wybrany.nauczycielId)) {
    priorytet += 30;
  }

  // Bonus za niskie wykorzystanie (wyrównanie obciążeń)
  if (wybrany.procentWykorzystania < 50) {
    priorytet += 20;
  } else if (wybrany.procentWykorzystania > 80) {
    priorytet -= 10;
  }

  // Sprawdź, czy nauczyciel już uczy tego przedmiotu w tej klasie
  const istniejące = await payload.find({
    collection: 'rozkład-godzin',
    where: {
      and: [
        {
          przedmiot: {
            equals: przedmiotId,
          },
        },
        {
          klasa: {
            equals: klasaId,
          },
        },
        {
          nauczyciel: {
            equals: wybrany.nauczycielId,
          },
        },
        {
          rok_szkolny: {
            equals: rokSzkolny,
          },
        },
      ],
    },
    limit: 1,
  });

  if (istniejące.docs.length > 0) {
    ostrzezenia.push('Nauczyciel już uczy tego przedmiotu w tej klasie');
    priorytet += 10; // Bonus za kontynuację
  }

  const powod = [
    preferowaniNauczyciele.includes(wybrany.nauczycielId) ? 'Preferowany nauczyciel' : null,
    wybrany.maKwalifikacje ? 'Ma kwalifikacje' : null,
    wybrany.dostepneObciazenie >= godzinyTygodniowo ? 'Ma wystarczające obciążenie' : null,
    wybrany.procentWykorzystania < 50 ? 'Niskie wykorzystanie (wyrównanie obciążeń)' : null,
  ].filter(Boolean).join(', ') || 'Najlepszy dostępny nauczyciel';

  const propozycja: PropozycjaPrzypisania = {
    przedmiotId,
    przedmiotNazwa: przedmiot.nazwa,
    klasaId,
    klasaNazwa: klasa.nazwa,
    nauczycielId: wybrany.nauczycielId,
    nauczycielNazwa: wybrany.nauczycielNazwa,
    godzinyTygodniowo,
    godzinyRoczne,
    priorytet,
    powod,
    ostrzezenia,
  };

  return {
    przypisanie: propozycja,
    dostepniNauczyciele: dostepni,
    problemy: ostrzezenia,
    czyMozliwe: true,
  };
}

/**
 * Proponuje optymalny rozkład godzin dla wielu przedmiotów/klas
 * 
 * Algorytm greedy: przypisuje po kolei, wybierając najlepszego dostępnego nauczyciela
 */
export async function proponujRozkladGodzin(
  payload: Payload,
  zadania: Array<{
    przedmiotId: string;
    klasaId: string;
    godzinyTygodniowo: number;
    godzinyRoczne: number;
    preferowaniNauczyciele?: string[];
    wykluczeniNauczyciele?: string[];
  }>,
  rokSzkolny: string
): Promise<{
  propozycje: PropozycjaPrzypisania[];
  problemy: string[];
  statystyki: {
    lacznie: number;
    udane: number;
    nieudane: number;
    sredniPriorytet: number;
  };
}> {
  const propozycje: PropozycjaPrzypisania[] = [];
  const problemy: string[] = [];
  const przypisaniNauczyciele = new Map<string, number>(); // nauczycielId -> suma godzin

  // Sortuj zadania według priorytetu (najpierw większe godziny, potem preferowani)
  const posortowaneZadania = [...zadania].sort((a, b) => {
    // Najpierw zadania z preferowanymi nauczycielami
    const aMaPreferowanych = (a.preferowaniNauczyciele?.length || 0) > 0;
    const bMaPreferowanych = (b.preferowaniNauczyciele?.length || 0) > 0;
    
    if (aMaPreferowanych !== bMaPreferowanych) {
      return bMaPreferowanych ? 1 : -1;
    }

    // Potem większe godziny
    return b.godzinyTygodniowo - a.godzinyTygodniowo;
  });

  for (const zadanie of posortowaneZadania) {
    // Aktualizuj wykluczonych nauczycieli (którzy już mają za dużo)
    const wykluczeni = Array.from(przypisaniNauczyciele.entries())
      .filter(([_, suma]) => suma >= 18) // Pełny etat
      .map(([id]) => id);

    const wynik = await proponujPrzypisanie(payload, {
      ...zadanie,
      rokSzkolny,
      wykluczeniNauczyciele: [
        ...(zadanie.wykluczeniNauczyciele || []),
        ...wykluczeni,
      ],
    });

    if (wynik.przypisanie) {
      propozycje.push(wynik.przypisanie);
      
      // Aktualizuj mapę przypisanych
      const obecnaSuma = przypisaniNauczyciele.get(wynik.przypisanie.nauczycielId) || 0;
      przypisaniNauczyciele.set(
        wynik.przypisanie.nauczycielId,
        obecnaSuma + wynik.przypisanie.godzinyTygodniowo
      );
    } else {
      problemy.push(
        `Nie można przypisać nauczyciela do ${zadanie.przedmiotId} w klasie ${zadanie.klasaId}: ${wynik.problemy.join(', ')}`
      );
    }
  }

  const statystyki = {
    lacznie: zadania.length,
    udane: propozycje.length,
    nieudane: zadania.length - propozycje.length,
    sredniPriorytet: propozycje.length > 0
      ? propozycje.reduce((sum, p) => sum + p.priorytet, 0) / propozycje.length
      : 0,
  };

  return {
    propozycje,
    problemy,
    statystyki,
  };
}

/**
 * Waliduje przypisanie przed zapisem
 */
export async function walidujPrzypisanie(
  payload: Payload,
  nauczycielId: string,
  przedmiotId: string,
  klasaId: string,
  godzinyTygodniowo: number,
  rokSzkolny: string
): Promise<{
  czyWazne: boolean;
  problemy: string[];
  ostrzezenia: string[];
}> {
  const problemy: string[] = [];
  const ostrzezenia: string[] = [];

  // Sprawdź kwalifikacje
  const kwalifikacje = await payload.find({
    collection: 'kwalifikacje',
    where: {
      and: [
        {
          nauczyciel: {
            equals: nauczycielId,
          },
        },
        {
          przedmiot: {
            equals: przedmiotId,
          },
        },
        {
          aktywne: {
            equals: true,
          },
        },
      ],
    },
    limit: 1,
  });

  if (kwalifikacje.docs.length === 0) {
    problemy.push('Nauczyciel nie ma kwalifikacji do tego przedmiotu');
  }

  // Sprawdź obciążenie
  const dostepnosc = await sprawdzDostepnoscNauczyciela(
    payload,
    nauczycielId,
    przedmiotId,
    rokSzkolny
  );

  const noweObciazenie = dostepnosc.aktualneObciazenie + godzinyTygodniowo;

  if (noweObciazenie > dostepnosc.maxObciazenie) {
    problemy.push(
      `Przypisanie spowoduje przekroczenie maksymalnego obciążenia (${noweObciazenie} > ${dostepnosc.maxObciazenie})`
    );
  } else if (noweObciazenie === dostepnosc.maxObciazenie) {
    ostrzezenia.push('Nauczyciel osiągnie maksymalne obciążenie');
  }

  // Sprawdź, czy nauczyciel jest aktywny
  const nauczyciel = await payload.findByID({
    collection: 'nauczyciele',
    id: nauczycielId,
  });

  if (!nauczyciel || !nauczyciel.aktywny) {
    problemy.push('Nauczyciel nie jest aktywny');
  }

  return {
    czyWazne: problemy.length === 0,
    problemy,
    ostrzezenia,
  };
}
