/**
 * Funkcje do obliczania zgodności z wymaganiami MEiN
 * 
 * Oblicza różnice między wymaganymi godzinami MEiN a godzinami zaplanowanymi przez szkołę,
 * wraz z procentem realizacji.
 */

import type { Payload } from '@/types/payload';

// Typy danych
export interface WynikZgodnosciMein {
  przedmiotId: string;
  przedmiotNazwa: string;
  typSzkolyId: string;
  typSzkolyNazwa: string;
  klasaId?: string;
  klasaNazwa?: string;
  numerKlasy?: number;
  
  // Wymagania MEiN
  wymaganeMein: {
    godziny_w_cyklu: number;
    godziny_tygodniowo_min?: number;
    godziny_tygodniowo_max?: number;
    obowiazkowe: boolean;
    klasa?: number; // NULL = cały cykl
  };
  
  // Realizowane przez szkołę
  realizowane: {
    godziny_roczne: number; // Suma godzin rocznych z wszystkich klas
    godziny_w_cyklu: number; // Suma godzin z całego cyklu (wszystkie klasy)
    godziny_tygodniowo_srednia: number; // Średnia godzin tygodniowo
  };
  
  // Obliczenia
  roznica: {
    godziny: number; // realizowane - wymagane (ujemne = brak, dodatnie = nadwyżka)
    procent_realizacji: number; // (realizowane / wymagane) * 100
  };
  
  // Status
  status: 'OK' | 'BRAK' | 'NADWYŻKA' | 'BRAK_DANYCH';
  alerty: string[];
}

export interface ParametryObliczen {
  przedmiotId?: string;
  typSzkolyId?: string;
  klasaId?: string;
  rokSzkolny?: string;
  dataSprawdzenia?: Date; // Dla sprawdzenia, które wymagania MEiN są aktualne
}

/**
 * Główna funkcja obliczająca zgodność z MEiN
 * 
 * @param payload - Instancja Payload CMS
 * @param parametry - Parametry filtrowania (przedmiot, typ szkoły, klasa, rok szkolny)
 * @returns Tablica wyników zgodności dla każdego przedmiotu/klasy
 */
export async function obliczZgodnoscMein(
  payload: Payload,
  parametry: ParametryObliczen = {}
): Promise<WynikZgodnosciMein[]> {
  const wyniki: WynikZgodnosciMein[] = [];
  const dataSprawdzenia = parametry.dataSprawdzenia || new Date();

  // 1. Pobierz wymagania MEiN (siatki godzin)
  const warunkiMein: any = {
    and: [
      {
        data_obowiazywania_od: {
          less_than_equal: dataSprawdzenia.toISOString(),
        },
      },
      {
        or: [
          {
            data_obowiazywania_do: {
              greater_than_equal: dataSprawdzenia.toISOString(),
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
  };

  if (parametry.przedmiotId) {
    warunkiMein.and.push({
      przedmiot: {
        equals: parametry.przedmiotId,
      },
    });
  }

  if (parametry.typSzkolyId) {
    warunkiMein.and.push({
      typ_szkoly: {
        equals: parametry.typSzkolyId,
      },
    });
  }

  const siatkiMein = await payload.find({
    collection: 'siatki-godzin-mein',
    where: warunkiMein,
    depth: 2, // Pobierz pełne dane przedmiotu i typu szkoły
  });

  // 2. Dla każdego wymagania MEiN oblicz realizację
  for (const siatkaMein of siatkiMein.docs) {
    const przedmiotId = typeof siatkaMein.przedmiot === 'string' 
      ? siatkaMein.przedmiot 
      : siatkaMein.przedmiot.id;
    
    const typSzkolyId = typeof siatkaMein.typ_szkoly === 'string'
      ? siatkaMein.typ_szkoly
      : siatkaMein.typ_szkoly.id;

    const przedmiot = typeof siatkaMein.przedmiot === 'object' 
      ? siatkaMein.przedmiot 
      : await payload.findByID({
          collection: 'przedmioty',
          id: przedmiotId,
        });

    const typSzkoly = typeof siatkaMein.typ_szkoly === 'object'
      ? siatkaMein.typ_szkoly
      : await payload.findByID({
          collection: 'typy-szkol',
          id: typSzkolyId,
        });

    // 3. Znajdź klasy dla tego typu szkoły
    const warunkiKlas: any = {
      and: [
        {
          typ_szkoly: {
            equals: typSzkolyId,
          },
        },
        {
          aktywna: {
            equals: true,
          },
        },
      ],
    };

    if (parametry.klasaId) {
      warunkiKlas.and.push({
        id: {
          equals: parametry.klasaId,
        },
      });
    }

    if (parametry.rokSzkolny) {
      warunkiKlas.and.push({
        rok_szkolny: {
          equals: parametry.rokSzkolny,
        },
      });
    }

    // Jeśli wymaganie jest dla konkretnej klasy, filtruj tylko tę klasę
    if (siatkaMein.klasa) {
      warunkiKlas.and.push({
        numer_klasy: {
          equals: siatkaMein.klasa,
        },
      });
    }

    const klasy = await payload.find({
      collection: 'klasy',
      where: warunkiKlas,
    });

    // 4. Dla każdej klasy oblicz realizację
    for (const klasa of klasy.docs) {
      // Pobierz rozkład godzin dla tej klasy i przedmiotu
      const rozklady = await payload.find({
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
                equals: klasa.id,
              },
            },
            ...(parametry.rokSzkolny ? [{
              rok_szkolny: {
                equals: parametry.rokSzkolny,
              },
            }] : []),
          ],
        },
      });

      // 5. Oblicz sumę realizowanych godzin
      const sumaGodzinRocznych = rozklady.docs.reduce(
        (suma, rozklad) => suma + (rozklad.godziny_roczne || 0),
        0
      );

      const sumaGodzinTygodniowo = rozklady.docs.reduce(
        (suma, rozklad) => suma + (rozklad.godziny_tyg || 0),
        0
      );

      // 6. Jeśli wymaganie jest dla całego cyklu, musimy zsumować wszystkie klasy
      let godziny_w_cyklu = sumaGodzinRocznych;
      
      if (!siatkaMein.klasa) {
        // Wymaganie dla całego cyklu - zsumuj wszystkie klasy tego typu szkoły
        const wszystkieKlasy = await payload.find({
          collection: 'klasy',
          where: {
            and: [
              {
                typ_szkoly: {
                  equals: typSzkolyId,
                },
              },
              {
                aktywna: {
                  equals: true,
                },
              },
              ...(parametry.rokSzkolny ? [{
                rok_szkolny: {
                  equals: parametry.rokSzkolny,
                },
              }] : []),
            ],
          },
        });

        let sumaCyklu = 0;
        for (const k of wszystkieKlasy.docs) {
          const rozkladyK = await payload.find({
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
                    equals: k.id,
                  },
                },
                ...(parametry.rokSzkolny ? [{
                  rok_szkolny: {
                    equals: parametry.rokSzkolny,
                  },
                }] : []),
              ],
            },
          });

          sumaCyklu += rozkladyK.docs.reduce(
            (suma, rozklad) => suma + (rozklad.godziny_roczne || 0),
            0
          );
        }
        godziny_w_cyklu = sumaCyklu;
      }

      // 7. Oblicz różnicę i procent realizacji
      const wymagane = siatkaMein.godziny_w_cyklu || 0;
      const roznica = godziny_w_cyklu - wymagane;
      const procentRealizacji = wymagane > 0 
        ? (godziny_w_cyklu / wymagane) * 100 
        : 0;

      // 8. Określ status
      let status: 'OK' | 'BRAK' | 'NADWYŻKA' | 'BRAK_DANYCH';
      const alerty: string[] = [];

      if (wymagane === 0) {
        status = 'BRAK_DANYCH';
        alerty.push('Brak wymagań MEiN dla tego przedmiotu');
      } else if (roznica < 0) {
        status = 'BRAK';
        alerty.push(`Brakuje ${Math.abs(roznica)} godzin (${Math.abs(procentRealizacji - 100).toFixed(1)}% poniżej wymaganego minimum)`);
      } else if (roznica > 0) {
        status = 'NADWYŻKA';
        alerty.push(`Nadwyżka ${roznica} godzin (${(procentRealizacji - 100).toFixed(1)}% powyżej wymaganego minimum)`);
      } else {
        status = 'OK';
      }

      // Sprawdź godziny tygodniowo
      if (siatkaMein.godziny_tygodniowo_min && sumaGodzinTygodniowo < siatkaMein.godziny_tygodniowo_min) {
        alerty.push(`Godziny tygodniowo (${sumaGodzinTygodniowo}) poniżej minimum (${siatkaMein.godziny_tygodniowo_min})`);
      }

      if (siatkaMein.godziny_tygodniowo_max && sumaGodzinTygodniowo > siatkaMein.godziny_tygodniowo_max) {
        alerty.push(`Godziny tygodniowo (${sumaGodzinTygodniowo}) powyżej maksimum (${siatkaMein.godziny_tygodniowo_max})`);
      }

      // 9. Utwórz wynik
      const wynik: WynikZgodnosciMein = {
        przedmiotId: przedmiotId,
        przedmiotNazwa: przedmiot?.nazwa || 'Nieznany przedmiot',
        typSzkolyId: typSzkolyId,
        typSzkolyNazwa: typSzkoly?.nazwa || 'Nieznany typ szkoły',
        klasaId: String(klasa.id),
        klasaNazwa: klasa.nazwa,
        numerKlasy: klasa.numer_klasy,
        wymaganeMein: {
          godziny_w_cyklu: wymagane,
          godziny_tygodniowo_min: siatkaMein.godziny_tygodniowo_min,
          godziny_tygodniowo_max: siatkaMein.godziny_tygodniowo_max,
          obowiazkowe: siatkaMein.obowiazkowe || false,
          klasa: siatkaMein.klasa || undefined,
        },
        realizowane: {
          godziny_roczne: sumaGodzinRocznych,
          godziny_w_cyklu: godziny_w_cyklu,
          godziny_tygodniowo_srednia: sumaGodzinTygodniowo,
        },
        roznica: {
          godziny: roznica,
          procent_realizacji: procentRealizacji,
        },
        status,
        alerty,
      };

      wyniki.push(wynik);
    }
  }

  return wyniki;
}

/**
 * Funkcja pomocnicza do obliczania zgodności dla pojedynczego przedmiotu w klasie
 * 
 * @param payload - Instancja Payload CMS
 * @param przedmiotId - ID przedmiotu
 * @param klasaId - ID klasy
 * @param rokSzkolny - Rok szkolny (opcjonalnie)
 * @returns Wynik zgodności lub null, jeśli brak danych
 */
export async function obliczZgodnoscDlaPrzedmiotuWKlasie(
  payload: Payload,
  przedmiotId: string,
  klasaId: string,
  rokSzkolny?: string
): Promise<WynikZgodnosciMein | null> {
  const wyniki = await obliczZgodnoscMein(payload, {
    przedmiotId,
    klasaId,
    rokSzkolny,
  });

  return wyniki.length > 0 ? wyniki[0] : null;
}

/**
 * Funkcja pomocnicza do obliczania zgodności dla całej szkoły
 * 
 * @param payload - Instancja Payload CMS
 * @param typSzkolyId - ID typu szkoły
 * @param rokSzkolny - Rok szkolny (opcjonalnie)
 * @returns Tablica wyników dla wszystkich przedmiotów
 */
export async function obliczZgodnoscDlaSzkoly(
  payload: Payload,
  typSzkolyId: string,
  rokSzkolny?: string
): Promise<WynikZgodnosciMein[]> {
  return obliczZgodnoscMein(payload, {
    typSzkolyId,
    rokSzkolny,
  });
}

/**
 * Funkcja pomocnicza do obliczania zgodności dla pojedynczej klasy
 * 
 * @param payload - Instancja Payload CMS
 * @param klasaId - ID klasy
 * @param rokSzkolny - Rok szkolny (opcjonalnie)
 * @returns Tablica wyników dla wszystkich przedmiotów w klasie
 */
export async function obliczZgodnoscDlaKlasy(
  payload: Payload,
  klasaId: string,
  rokSzkolny?: string
): Promise<WynikZgodnosciMein[]> {
  return obliczZgodnoscMein(payload, {
    klasaId,
    rokSzkolny,
  });
}

/**
 * Funkcja pomocnicza do formatowania wyniku zgodności jako tekst
 * 
 * @param wynik - Wynik zgodności
 * @returns Sformatowany tekst z informacją o zgodności
 */
export function formatujWynikZgodnosci(wynik: WynikZgodnosciMein): string {
  const linie: string[] = [];
  
  linie.push(`Przedmiot: ${wynik.przedmiotNazwa}`);
  linie.push(`Klasa: ${wynik.klasaNazwa || 'Wszystkie klasy'}`);
  linie.push(`Typ szkoły: ${wynik.typSzkolyNazwa}`);
  linie.push('');
  linie.push(`Wymagane MEiN: ${wynik.wymaganeMein.godziny_w_cyklu} godzin w cyklu`);
  linie.push(`Realizowane: ${wynik.realizowane.godziny_w_cyklu} godzin w cyklu`);
  linie.push(`Różnica: ${wynik.roznica.godziny > 0 ? '+' : ''}${wynik.roznica.godziny} godzin`);
  linie.push(`Procent realizacji: ${wynik.roznica.procent_realizacji.toFixed(1)}%`);
  linie.push(`Status: ${wynik.status}`);
  
  if (wynik.alerty.length > 0) {
    linie.push('');
    linie.push('Alerty:');
    wynik.alerty.forEach(alert => linie.push(`  - ${alert}`));
  }
  
  return linie.join('\n');
}
