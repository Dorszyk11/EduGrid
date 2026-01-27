import type { Payload } from 'payload/types';

export interface WynikWeryfikacjiSum {
  poprawna: boolean;
  sumaOczekiwana: number;
  sumaRzeczywista: number;
  roznica: number;
  szczegoly: Array<{
    przedmiot: string;
    klasa: string;
    oczekiwane: number;
    rzeczywiste: number;
    roznica: number;
  }>;
  bledy: string[];
}

/**
 * Weryfikuje sumy godzin w siatce MEiN
 * Sprawdza czy suma godzin dla każdego przedmiotu/klasy jest zgodna z wymaganiami
 */
export async function weryfikujSumyGodzin(
  payload: Payload,
  typSzkolyId: string,
  rokSzkolny: string
): Promise<WynikWeryfikacjiSum> {
  const szczegoly: WynikWeryfikacjiSum['szczegoly'] = [];
  const bledy: string[] = [];
  let sumaOczekiwana = 0;
  let sumaRzeczywista = 0;

  // Pobierz wymagania MEiN
  const siatkiMein = await payload.find({
    collection: 'siatki-godzin-mein',
    where: {
      and: [
        {
          typ_szkoly: {
            equals: typSzkolyId,
          },
        },
        {
          data_obowiazywania_od: {
            less_than_equal: new Date().toISOString(),
          },
        },
      ],
    },
    depth: 2,
    limit: 10000,
  });

  // Pobierz rozkład godzin
  const klasy = await payload.find({
    collection: 'klasy',
    where: {
      and: [
        {
          typ_szkoly: {
            equals: typSzkolyId,
          },
        },
        {
          rok_szkolny: {
            equals: rokSzkolny,
          },
        },
        {
          aktywna: {
            equals: true,
          },
        },
      ],
    },
    limit: 1000,
  });

  for (const klasa of klasy.docs) {
    const rozklady = await payload.find({
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
        ],
      },
      depth: 1,
      limit: 1000,
    });

    // Grupuj po przedmiotach
    const przedmiotyMap = new Map<string, number>();
    for (const rozklad of rozklady.docs) {
      const przedmiotId = typeof rozklad.przedmiot === 'object' 
        ? rozklad.przedmiot.id 
        : rozklad.przedmiot;
      const godziny = rozklad.godziny_roczne || 0;
      przedmiotyMap.set(
        przedmiotId,
        (przedmiotyMap.get(przedmiotId) || 0) + godziny
      );
    }

    // Sprawdź wymagania MEiN dla tej klasy
    const wymaganiaDlaKlasy = siatkiMein.docs.filter(sm => {
      const smKlasa = sm.klasa;
      const klasaNumer = klasa.numer_klasy;
      return smKlasa === null || smKlasa === klasaNumer;
    });

    for (const wymaganie of wymaganiaDlaKlasy) {
      const przedmiotId = typeof wymaganie.przedmiot === 'object' 
        ? wymaganie.przedmiot.id 
        : wymaganie.przedmiot;
      const przedmiotNazwa = typeof wymaganie.przedmiot === 'object' 
        ? wymaganie.przedmiot.nazwa 
        : 'Nieznany';
      const klasaNazwa = klasa.nazwa;

      const oczekiwane = wymaganie.godziny_w_cyklu || 0;
      const rzeczywiste = przedmiotyMap.get(przedmiotId) || 0;
      const roznica = rzeczywiste - oczekiwane;

      sumaOczekiwana += oczekiwane;
      sumaRzeczywista += rzeczywiste;

      szczegoly.push({
        przedmiot: przedmiotNazwa,
        klasa: klasaNazwa,
        oczekiwane,
        rzeczywiste,
        roznica,
      });

      if (Math.abs(roznica) > 0.1) { // Tolerancja 0.1 godziny
        if (roznica < 0) {
          bledy.push(
            `Brak ${Math.abs(roznica).toFixed(1)}h dla ${przedmiotNazwa} w ${klasaNazwa}`
          );
        } else {
          bledy.push(
            `Nadwyżka ${roznica.toFixed(1)}h dla ${przedmiotNazwa} w ${klasaNazwa}`
          );
        }
      }
    }
  }

  const roznica = sumaRzeczywista - sumaOczekiwana;
  const poprawna = Math.abs(roznica) < 0.1 && bledy.length === 0;

  return {
    poprawna,
    sumaOczekiwana,
    sumaRzeczywista,
    roznica,
    szczegoly,
    bledy,
  };
}
