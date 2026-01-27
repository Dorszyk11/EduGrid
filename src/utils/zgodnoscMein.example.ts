/**
 * Przykłady użycia funkcji obliczania zgodności z MEiN
 */

import type { Payload } from 'payload/types';
import {
  obliczZgodnoscMein,
  obliczZgodnoscDlaPrzedmiotuWKlasie,
  obliczZgodnoscDlaSzkoly,
  obliczZgodnoscDlaKlasy,
  formatujWynikZgodnosci,
  type WynikZgodnosciMein,
} from './zgodnoscMein';

/**
 * PRZYKŁAD 1: Oblicz zgodność dla pojedynczego przedmiotu w klasie
 */
export async function przyklad1_PrzedmiotWKlasie(payload: Payload) {
  const przedmiotId = 'przedmiot-id-123';
  const klasaId = 'klasa-id-456';
  const rokSzkolny = '2024/2025';

  const wynik = await obliczZgodnoscDlaPrzedmiotuWKlasie(
    payload,
    przedmiotId,
    klasaId,
    rokSzkolny
  );

  if (wynik) {
    console.log('Wynik zgodności:');
    console.log(formatujWynikZgodnosci(wynik));
    
    // Dostęp do szczegółowych danych
    console.log(`Status: ${wynik.status}`);
    console.log(`Procent realizacji: ${wynik.roznica.procent_realizacji.toFixed(1)}%`);
    console.log(`Różnica: ${wynik.roznica.godziny} godzin`);
    
    if (wynik.alerty.length > 0) {
      console.log('Alerty:');
      wynik.alerty.forEach(alert => console.log(`  - ${alert}`));
    }
  } else {
    console.log('Brak danych dla tego przedmiotu w klasie');
  }
}

/**
 * PRZYKŁAD 2: Oblicz zgodność dla całej klasy
 */
export async function przyklad2_CalaKlasa(payload: Payload) {
  const klasaId = 'klasa-id-456';
  const rokSzkolny = '2024/2025';

  const wyniki = await obliczZgodnoscDlaKlasy(
    payload,
    klasaId,
    rokSzkolny
  );

  console.log(`Znaleziono ${wyniki.length} przedmiotów w klasie`);
  
  // Grupuj według statusu
  const zgodne = wyniki.filter(w => w.status === 'OK');
  const zBrakami = wyniki.filter(w => w.status === 'BRAK');
  const zNadwyzkami = wyniki.filter(w => w.status === 'NADWYŻKA');
  
  console.log(`Zgodne: ${zgodne.length}`);
  console.log(`Z brakami: ${zBrakami.length}`);
  console.log(`Z nadwyżkami: ${zNadwyzkami.length}`);
  
  // Pokaż przedmioty z brakami
  if (zBrakami.length > 0) {
    console.log('\nPrzedmioty z brakami godzin:');
    zBrakami.forEach(w => {
      console.log(`  - ${w.przedmiotNazwa}: brakuje ${Math.abs(w.roznica.godziny)} godzin`);
    });
  }
}

/**
 * PRZYKŁAD 3: Oblicz zgodność dla całej szkoły
 */
export async function przyklad3_CalaSzkola(payload: Payload) {
  const typSzkolyId = 'typ-szkoly-id-789';
  const rokSzkolny = '2024/2025';

  const wyniki = await obliczZgodnoscDlaSzkoly(
    payload,
    typSzkolyId,
    rokSzkolny
  );

  // Statystyki dla całej szkoły
  const statystyki = {
    lacznie: wyniki.length,
    zgodne: wyniki.filter(w => w.status === 'OK').length,
    zBrakami: wyniki.filter(w => w.status === 'BRAK').length,
    zNadwyzkami: wyniki.filter(w => w.status === 'NADWYŻKA').length,
    sredniProcent: wyniki.reduce((sum, w) => sum + w.roznica.procent_realizacji, 0) / wyniki.length,
  };

  console.log('Statystyki zgodności dla całej szkoły:');
  console.log(`Łącznie przedmiotów: ${statystyki.lacznie}`);
  console.log(`Zgodne: ${statystyki.zgodne} (${(statystyki.zgodne / statystyki.lacznie * 100).toFixed(1)}%)`);
  console.log(`Z brakami: ${statystyki.zBrakami} (${(statystyki.zBrakami / statystyki.lacznie * 100).toFixed(1)}%)`);
  console.log(`Z nadwyżkami: ${statystyki.zNadwyzkami} (${(statystyki.zNadwyzkami / statystyki.lacznie * 100).toFixed(1)}%)`);
  console.log(`Średni procent realizacji: ${statystyki.sredniProcent.toFixed(1)}%`);
}

/**
 * PRZYKŁAD 4: Użycie w API endpoint (Next.js)
 */
export async function przyklad4_ApiEndpoint(payload: Payload, klasaId: string) {
  // W Next.js API route:
  // export default async function handler(req, res) {
  //   const wyniki = await obliczZgodnoscDlaKlasy(payload, klasaId);
  //   res.json(wyniki);
  // }

  const wyniki = await obliczZgodnoscDlaKlasy(payload, klasaId);

  // Formatuj dla API
  return wyniki.map(w => ({
    przedmiot: w.przedmiotNazwa,
    klasa: w.klasaNazwa,
    wymagane: w.wymaganeMein.godziny_w_cyklu,
    realizowane: w.realizowane.godziny_w_cyklu,
    roznica: w.roznica.godziny,
    procent: w.roznica.procent_realizacji,
    status: w.status,
    alerty: w.alerty,
  }));
}

/**
 * PRZYKŁAD 5: Filtrowanie i sortowanie wyników
 */
export async function przyklad5_Filtrowanie(payload: Payload) {
  const wyniki = await obliczZgodnoscMein(payload, {
    typSzkolyId: 'typ-szkoly-id-789',
    rokSzkolny: '2024/2025',
  });

  // Sortuj według procentu realizacji (najgorsze na górze)
  const posortowane = wyniki.sort((a, b) => 
    a.roznica.procent_realizacji - b.roznica.procent_realizacji
  );

  // Pokaż 10 najgorszych
  console.log('10 przedmiotów z najniższym procentem realizacji:');
  posortowane.slice(0, 10).forEach((w, index) => {
    console.log(`${index + 1}. ${w.przedmiotNazwa} - ${w.roznica.procent_realizacji.toFixed(1)}%`);
  });

  // Filtruj tylko obowiązkowe przedmioty z brakami
  const obowiazkoweZBrakami = wyniki.filter(w => 
    w.wymaganeMein.obowiazkowe && w.status === 'BRAK'
  );

  console.log(`\nObowiązkowe przedmioty z brakami: ${obowiazkoweZBrakami.length}`);
  obowiazkoweZBrakami.forEach(w => {
    console.log(`  - ${w.przedmiotNazwa} (${w.klasaNazwa}): brakuje ${Math.abs(w.roznica.godziny)} godzin`);
  });
}
