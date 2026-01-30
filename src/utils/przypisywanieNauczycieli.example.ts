/**
 * Przykłady użycia funkcji przypisywania nauczycieli
 */

import { getPayload } from 'payload';
import config from '@/payload.config';

type Payload = Awaited<ReturnType<typeof getPayload<typeof config>>>;
import {
  sprawdzDostepnoscNauczyciela,
  znajdzDostepnychNauczycieli,
  proponujPrzypisanie,
  proponujRozkladGodzin,
  walidujPrzypisanie,
} from './przypisywanieNauczycieli';

/**
 * PRZYKŁAD 1: Sprawdzenie dostępności nauczyciela
 */
export async function przyklad1_SprawdzDostepnosc(payload: Payload) {
  const nauczycielId = 'nauczyciel-id-123';
  const przedmiotId = 'przedmiot-id-456';
  const rokSzkolny = '2024/2025';

  const dostepnosc = await sprawdzDostepnoscNauczyciela(
    payload,
    nauczycielId,
    przedmiotId,
    rokSzkolny
  );

  console.log(`Nauczyciel: ${dostepnosc.nauczycielNazwa}`);
  console.log(`Maksymalne obciążenie: ${dostepnosc.maxObciazenie} godzin tygodniowo`);
  console.log(`Aktualne obciążenie: ${dostepnosc.aktualneObciazenie} godzin tygodniowo`);
  console.log(`Dostępne obciążenie: ${dostepnosc.dostepneObciazenie} godzin tygodniowo`);
  console.log(`Procent wykorzystania: ${dostepnosc.procentWykorzystania.toFixed(1)}%`);
  console.log(`Ma kwalifikacje: ${dostepnosc.maKwalifikacje ? 'TAK' : 'NIE'}`);

  if (dostepnosc.kwalifikacje) {
    console.log(`Stopień: ${dostepnosc.kwalifikacje.stopien || 'brak'}`);
    console.log(`Specjalizacja: ${dostepnosc.kwalifikacje.specjalizacja || 'brak'}`);
  }
}

/**
 * PRZYKŁAD 2: Znajdowanie dostępnych nauczycieli
 */
export async function przyklad2_ZnajdzDostepnych(payload: Payload) {
  const przedmiotId = 'przedmiot-id-456';
  const rokSzkolny = '2024/2025';

  const dostepni = await znajdzDostepnychNauczycieli(
    payload,
    przedmiotId,
    rokSzkolny,
    {
      wymagajKwalifikacji: true,
      minimalneObciazenie: 4, // Minimum 4 godziny tygodniowo dostępne
    }
  );

  console.log(`Znaleziono ${dostepni.length} dostępnych nauczycieli:`);
  
  dostepni.forEach((nauczyciel, index) => {
    console.log(`${index + 1}. ${nauczyciel.nauczycielNazwa}`);
    console.log(`   Dostępne: ${nauczyciel.dostepneObciazenie} godzin tygodniowo`);
    console.log(`   Wykorzystanie: ${nauczyciel.procentWykorzystania.toFixed(1)}%`);
  });
}

/**
 * PRZYKŁAD 3: Proponowanie przypisania dla pojedynczego przedmiotu
 */
export async function przyklad3_ProponujPrzypisanie(payload: Payload) {
  const wynik = await proponujPrzypisanie(payload, {
    przedmiotId: 'przedmiot-id-456',
    klasaId: 'klasa-id-789',
    godzinyTygodniowo: 4,
    godzinyRoczne: 120,
    rokSzkolny: '2024/2025',
    preferowaniNauczyciele: ['nauczyciel-id-123'], // Preferuj tego nauczyciela
    wymagajKwalifikacji: true,
  });

  if (wynik.przypisanie) {
    console.log('Propozycja przypisania:');
    console.log(`  Przedmiot: ${wynik.przypisanie.przedmiotNazwa}`);
    console.log(`  Klasa: ${wynik.przypisanie.klasaNazwa}`);
    console.log(`  Nauczyciel: ${wynik.przypisanie.nauczycielNazwa}`);
    console.log(`  Godziny: ${wynik.przypisanie.godzinyTygodniowo} tyg / ${wynik.przypisanie.godzinyRoczne} rocznie`);
    console.log(`  Priorytet: ${wynik.przypisanie.priorytet}`);
    console.log(`  Powód: ${wynik.przypisanie.powod}`);

    if (wynik.przypisanie.ostrzezenia.length > 0) {
      console.log('  Ostrzeżenia:');
      wynik.przypisanie.ostrzezenia.forEach(ostrzezenie => {
        console.log(`    - ${ostrzezenie}`);
      });
    }
  } else {
    console.log('Nie można przypisać nauczyciela:');
    wynik.problemy.forEach(problem => {
      console.log(`  - ${problem}`);
    });
  }
}

/**
 * PRZYKŁAD 4: Proponowanie rozkładu dla wielu przedmiotów
 */
export async function przyklad4_ProponujRozklad(payload: Payload) {
  const zadania = [
    {
      przedmiotId: 'przedmiot-jp',
      klasaId: 'klasa-1a',
      godzinyTygodniowo: 4,
      godzinyRoczne: 120,
      preferowaniNauczyciele: ['nauczyciel-kowalski'],
    },
    {
      przedmiotId: 'przedmiot-mat',
      klasaId: 'klasa-1a',
      godzinyTygodniowo: 4,
      godzinyRoczne: 120,
    },
    {
      przedmiotId: 'przedmiot-jp',
      klasaId: 'klasa-1b',
      godzinyTygodniowo: 4,
      godzinyRoczne: 120,
    },
    {
      przedmiotId: 'przedmiot-hist',
      klasaId: 'klasa-1a',
      godzinyTygodniowo: 2,
      godzinyRoczne: 60,
    },
  ];

  const wynik = await proponujRozkladGodzin(
    payload,
    zadania,
    '2024/2025'
  );

  console.log('Statystyki:');
  console.log(`  Łącznie zadań: ${wynik.statystyki.lacznie}`);
  console.log(`  Udane przypisania: ${wynik.statystyki.udane}`);
  console.log(`  Nieudane: ${wynik.statystyki.nieudane}`);
  console.log(`  Średni priorytet: ${wynik.statystyki.sredniPriorytet.toFixed(1)}`);

  console.log('\nPropozycje przypisań:');
  wynik.propozycje.forEach((propozycja, index) => {
    console.log(`${index + 1}. ${propozycja.przedmiotNazwa} - ${propozycja.klasaNazwa}`);
    console.log(`   Nauczyciel: ${propozycja.nauczycielNazwa}`);
    console.log(`   Godziny: ${propozycja.godzinyTygodniowo} tyg`);
    console.log(`   Priorytet: ${propozycja.priorytet}`);
  });

  if (wynik.problemy.length > 0) {
    console.log('\nProblemy:');
    wynik.problemy.forEach(problem => {
      console.log(`  - ${problem}`);
    });
  }
}

/**
 * PRZYKŁAD 5: Walidacja przed zapisem
 */
export async function przyklad5_WalidujPrzypisanie(payload: Payload) {
  const walidacja = await walidujPrzypisanie(
    payload,
    'nauczyciel-id-123',
    'przedmiot-id-456',
    'klasa-id-789',
    4, // godziny tygodniowo
    '2024/2025'
  );

  if (walidacja.czyWazne) {
    console.log('✅ Przypisanie jest ważne i można je zapisać');
    
    if (walidacja.ostrzezenia.length > 0) {
      console.log('Ostrzeżenia:');
      walidacja.ostrzezenia.forEach(ostrzezenie => {
        console.log(`  ⚠️ ${ostrzezenie}`);
      });
    }
  } else {
    console.log('❌ Przypisanie nie jest ważne:');
    walidacja.problemy.forEach(problem => {
      console.log(`  - ${problem}`);
    });
  }
}

/**
 * PRZYKŁAD 6: Automatyczne wyrównanie obciążeń
 */
export async function przyklad6_WyrownajObciazenia(payload: Payload) {
  // Pobierz wszystkich aktywnych nauczycieli
  const nauczyciele = await payload.find({
    collection: 'nauczyciele',
    where: {
      aktywny: {
        equals: true,
      },
    },
  });

  const rokSzkolny = '2024/2025';
  const obciazenia: Array<{
    nauczycielId: string;
    nauczycielNazwa: string;
    aktualne: number;
    max: number;
    procent: number;
  }> = [];

  // Oblicz obciążenia wszystkich nauczycieli
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

    const aktualne = rozklady.docs.reduce(
      (suma, rozklad) => suma + (rozklad.godziny_tyg || 0),
      0
    );
    const max = nauczyciel.max_obciazenie || 18;
    const procent = max > 0 ? (aktualne / max) * 100 : 0;

    obciazenia.push({
      nauczycielId: nauczyciel.id,
      nauczycielNazwa: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
      aktualne,
      max,
      procent,
    });
  }

  // Sortuj według procentu wykorzystania
  obciazenia.sort((a, b) => a.procent - b.procent);

  console.log('Obciążenia nauczycieli (od najniższego do najwyższego):');
  obciazenia.forEach((obciazenie, index) => {
    const status = obciazenie.procent < 50 ? '🟢' : obciazenie.procent < 80 ? '🟡' : '🔴';
    console.log(
      `${index + 1}. ${status} ${obciazenie.nauczycielNazwa}: ` +
      `${obciazenie.aktualne}/${obciazenie.max} (${obciazenie.procent.toFixed(1)}%)`
    );
  });

  // Znajdź nauczycieli z najniższym obciążeniem (do wyrównania)
  const niskoObciazeni = obciazenia.filter(o => o.procent < 50);
  console.log(`\nNauczyciele z niskim obciążeniem (<50%): ${niskoObciazeni.length}`);
  
  // Znajdź nauczycieli z wysokim obciążeniem (można przenieść godziny)
  const wysokoObciazeni = obciazenia.filter(o => o.procent > 90);
  console.log(`Nauczyciele z wysokim obciążeniem (>90%): ${wysokoObciazeni.length}`);
}
