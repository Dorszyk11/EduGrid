import type { Payload } from '@/types/payload';
import { obliczZgodnoscDlaSzkoly } from './zgodnoscMein';
import { automatycznyRozdzialGodzin } from './automatycznyRozdzialGodzin';

export interface WskaznikRyzyka {
  wartosc: number; // 0-100, gdzie 100 = największe ryzyko
  kategoria: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
  czynniki: Array<{
    nazwa: string;
    wplyw: number; // 0-100
    opis: string;
  }>;
  rekomendacje: string[];
}

/**
 * Oblicza wskaźnik ryzyka dla szkoły (0-100)
 * 
 * Czynniki ryzyka:
 * - Braki kadrowe (wysoki wpływ)
 * - Przekroczenia obciążeń nauczycieli (średni wpływ)
 * - Niezgodności z MEiN (średni wpływ)
 * - Brak przypisań (wysoki wpływ)
 * - Niskie obciążenia nauczycieli (niski wpływ)
 */
export async function obliczWskaznikRyzyka(
  payload: Payload,
  typSzkolyId: string,
  rokSzkolny: string
): Promise<WskaznikRyzyka> {
  const czynniki: WskaznikRyzyka['czynniki'] = [];
  const rekomendacje: string[] = [];

  // 1. Sprawdź zgodność z MEiN
  const zgodnosc = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny);
  const brakiMein = zgodnosc.filter(w => w.status === 'BRAK');
  const nadwyzkiMein = zgodnosc.filter(w => w.status === 'NADWYŻKA');
  const zgodne = zgodnosc.filter(w => w.status === 'OK');

  if (brakiMein.length > 0) {
    const procentBrakow = (brakiMein.length / zgodnosc.length) * 100;
    const wplyw = Math.min(100, procentBrakow * 1.5); // Maksymalny wpływ 100
    czynniki.push({
      nazwa: 'Braki zgodności z MEiN',
      wplyw: Math.round(wplyw),
      opis: `${brakiMein.length} z ${zgodnosc.length} przedmiotów/klas ma braki godzin`,
    });
    
    if (wplyw > 50) {
      rekomendacje.push('Pilnie uzupełnij braki godzin zgodnie z wymaganiami MEiN');
    }
  }

  // 2. Sprawdź braki kadrowe
  const rozdzial = await automatycznyRozdzialGodzin(payload, {
    typSzkolyId,
    rokSzkolny,
  });

  if (rozdzial.brakiKadrowe.length > 0) {
    const laczneGodzinyBrakow = rozdzial.brakiKadrowe.reduce(
      (sum, b) => sum + b.godzinyTygodniowo,
      0
    );
    const wplyw = Math.min(100, laczneGodzinyBrakow * 5); // 5 punktów za każdą godzinę braku
    czynniki.push({
      nazwa: 'Braki kadrowe',
      wplyw: Math.round(wplyw),
      opis: `${rozdzial.brakiKadrowe.length} przedmiotów/klas bez nauczycieli (${laczneGodzinyBrakow}h/tyg)`,
    });
    
    if (wplyw > 30) {
      rekomendacje.push(`Zatrudnij ${Math.ceil(laczneGodzinyBrakow / 18)} nauczycieli (${laczneGodzinyBrakow}h/tyg)`);
    }
  }

  // 3. Sprawdź obciążenia nauczycieli
  const nauczyciele = await payload.find({
    collection: 'nauczyciele',
    where: {
      aktywny: {
        equals: true,
      },
    },
    limit: 1000,
  });

  const przekroczenia: number[] = [];
  const niskieObciazenia: number[] = [];

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

    const sumaGodzin = rozklady.docs.reduce((sum, r) => sum + (r.godziny_tyg || 0), 0);
    const maxObciazenie = nauczyciel.max_obciazenie || 18;
    const procentWykorzystania = maxObciazenie > 0 ? (sumaGodzin / maxObciazenie) * 100 : 0;

    if (sumaGodzin > maxObciazenie) {
      przekroczenia.push(sumaGodzin - maxObciazenie);
    } else if (procentWykorzystania < 50 && sumaGodzin > 0) {
      niskieObciazenia.push(50 - procentWykorzystania);
    }
  }

  if (przekroczenia.length > 0) {
    const sredniePrzekroczenie = przekroczenia.reduce((sum, p) => sum + p, 0) / przekroczenia.length;
    const wplyw = Math.min(60, przekroczenia.length * 10 + sredniePrzekroczenie * 2);
    czynniki.push({
      nazwa: 'Przekroczenia obciążeń',
      wplyw: Math.round(wplyw),
      opis: `${przekroczenia.length} nauczycieli przekroczyło maksymalne obciążenie (śr. ${sredniePrzekroczenie.toFixed(1)}h)`,
    });
    
    if (wplyw > 30) {
      rekomendacje.push('Zredukuj obciążenia przekroczonych nauczycieli lub zatrudnij dodatkową kadrę');
    }
  }

  if (niskieObciazenia.length > 0 && niskieObciazenia.length > nauczyciele.docs.length * 0.2) {
    const wplyw = Math.min(20, niskieObciazenia.length * 2);
    czynniki.push({
      nazwa: 'Niskie obciążenia',
      wplyw: Math.round(wplyw),
      opis: `${niskieObciazenia.length} nauczycieli ma obciążenie poniżej 50%`,
    });
    
    if (wplyw > 10) {
      rekomendacje.push('Rozważ zwiększenie obciążeń niedociążonych nauczycieli lub redukcję etatów');
    }
  }

  // 4. Sprawdź brak przypisań
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

  let klasyBezPrzypisan = 0;
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
      limit: 1,
    });

    if (rozklady.docs.length === 0) {
      klasyBezPrzypisan++;
    }
  }

  if (klasyBezPrzypisan > 0) {
    const procentKlasBezPrzypisan = (klasyBezPrzypisan / klasy.docs.length) * 100;
    const wplyw = Math.min(80, procentKlasBezPrzypisan * 1.5);
    czynniki.push({
      nazwa: 'Klasy bez przypisań',
      wplyw: Math.round(wplyw),
      opis: `${klasyBezPrzypisan} z ${klasy.docs.length} klas nie ma żadnych przypisań`,
    });
    
    if (wplyw > 20) {
      rekomendacje.push('Przypisz nauczycieli do klas bez przypisań');
    }
  }

  // Oblicz całkowity wskaźnik ryzyka
  const sumaWplywow = czynniki.reduce((sum, c) => sum + c.wplyw, 0);
  const maksymalnyWplyw = czynniki.length * 100;
  const wartosc = maksymalnyWplyw > 0 ? Math.min(100, (sumaWplywow / maksymalnyWplyw) * 100) : 0;

  // Określ kategorię
  let kategoria: WskaznikRyzyka['kategoria'];
  if (wartosc >= 75) {
    kategoria = 'krytyczny';
  } else if (wartosc >= 50) {
    kategoria = 'wysoki';
  } else if (wartosc >= 25) {
    kategoria = 'średni';
  } else {
    kategoria = 'niski';
  }

  // Dodaj ogólne rekomendacje jeśli brak
  if (rekomendacje.length === 0 && wartosc > 0) {
    rekomendacje.push('Monitoruj sytuację i podejmij działania prewencyjne');
  }

  return {
    wartosc: Math.round(wartosc),
    kategoria,
    czynniki,
    rekomendacje,
  };
}
