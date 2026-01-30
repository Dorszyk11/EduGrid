/**
 * Przykłady użycia algorytmu automatycznego rozdziału godzin
 */

import { getPayload } from 'payload';
import config from '@/payload.config';
import { automatycznyRozdzialGodzin } from './automatycznyRozdzialGodzin';

type Payload = Awaited<ReturnType<typeof getPayload<typeof config>>>;

/**
 * PRZYKŁAD 1: Automatyczny rozdział dla całej szkoły
 */
export async function przyklad1_CalaSzkola(payload: Payload) {
  const wynik = await automatycznyRozdzialGodzin(payload, {
    rokSzkolny: '2024/2025',
    wymagajKwalifikacji: true,
    preferujKontynuacje: true,
  });

  console.log('=== WYNIKI AUTOMATYCZNEGO ROZDZIAŁU ===\n');

  console.log('Metryki:');
  console.log(`  Łącznie zadań: ${wynik.metryki.lacznieZadan}`);
  console.log(`  Udane przypisania: ${wynik.metryki.udanePrzypisania}`);
  console.log(`  Nieudane: ${wynik.metryki.nieudanePrzypisania}`);
  console.log(`  Średnie obciążenie: ${wynik.metryki.srednieObciazenie.toFixed(2)} godzin/tyg`);
  console.log(`  Odchylenie standardowe: ${wynik.metryki.odchylenieStandardowe.toFixed(2)}`);
  console.log(`  Współczynnik wyrównania: ${(wynik.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%`);

  if (wynik.ostrzezenia.length > 0) {
    console.log('\nOstrzeżenia:');
    wynik.ostrzezenia.forEach(ostrzezenie => {
      console.log(`  ⚠️ ${ostrzezenie}`);
    });
  }

  if (wynik.brakiKadrowe.length > 0) {
    console.log('\n=== BRAKI KADROWE ===');
    wynik.brakiKadrowe.forEach((brak, index) => {
      console.log(`\n${index + 1}. ${brak.przedmiotNazwa} - ${brak.klasaNazwa}`);
      console.log(`   Godziny: ${brak.godzinyTygodniowo} tyg`);
      console.log(`   Powód: ${brak.powod}`);
      console.log(`   Dostępni nauczyciele (bez czasu): ${brak.dostepniNauczyciele}`);
      console.log(`   Sugerowane rozwiązania:`);
      brak.sugerowaneRozwiazania.forEach(rozwiazanie => {
        console.log(`     - ${rozwiazanie}`);
      });
    });
  }

  console.log('\n=== STATYSTYKI OBCIĄŻEŃ ===');
  wynik.statystykiObciazenia
    .sort((a, b) => b.poObciazeniu - a.poObciazeniu)
    .forEach((stat, index) => {
      const status = stat.poObciazeniu > stat.maxObciazenie ? '🔴' :
                     stat.procentWykorzystania > 80 ? '🟡' : '🟢';
      console.log(
        `${index + 1}. ${status} ${stat.nauczycielNazwa}: ` +
        `${stat.poObciazeniu}/${stat.maxObciazenie} (${stat.procentWykorzystania.toFixed(1)}%) ` +
        `[+${stat.roznica} godzin, ${stat.przypisania} przypisań]`
      );
    });
}

/**
 * PRZYKŁAD 2: Automatyczny rozdział dla konkretnego typu szkoły
 */
export async function przyklad2_TypSzkoly(payload: Payload) {
  const typSzkolyId = 'typ-szkoly-liceum-id';

  const wynik = await automatycznyRozdzialGodzin(payload, {
    typSzkolyId,
    rokSzkolny: '2024/2025',
    wymagajKwalifikacji: true,
    preferujKontynuacje: true,
  });

  console.log(`Automatyczny rozdział dla typu szkoły: ${typSzkolyId}`);
  console.log(`Współczynnik wyrównania: ${(wynik.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%`);
  console.log(`Braki kadrowe: ${wynik.brakiKadrowe.length}`);
}

/**
 * PRZYKŁAD 3: Zapis przypisań do bazy danych
 */
export async function przyklad3_ZapiszPrzypisania(payload: Payload) {
  const wynik = await automatycznyRozdzialGodzin(payload, {
    rokSzkolny: '2024/2025',
  });

  console.log(`Zapisywanie ${wynik.przypisania.length} przypisań...`);

  let udane = 0;
  let nieudane = 0;

  for (const przypisanie of wynik.przypisania) {
    try {
      // Sprawdź, czy przypisanie już istnieje
      const istniejące = await payload.find({
        collection: 'rozkład-godzin',
        where: {
          and: [
            {
              przedmiot: {
                equals: przypisanie.przedmiotId,
              },
            },
            {
              klasa: {
                equals: przypisanie.klasaId,
              },
            },
            {
              nauczyciel: {
                equals: przypisanie.nauczycielId,
              },
            },
            {
              rok_szkolny: {
                equals: '2024/2025',
              },
            },
          ],
        },
        limit: 1,
      });

      if (istniejące.docs.length > 0) {
        // Aktualizuj istniejące
        await payload.update({
          collection: 'rozkład-godzin',
          id: istniejące.docs[0].id,
          data: {
            godzinyTygodniowo: przypisanie.godzinyTygodniowo,
            godzinyRoczne: przypisanie.godzinyRoczne,
          },
        });
      } else {
        // Utwórz nowe
        await payload.create({
          collection: 'rozkład-godzin',
          data: {
            przedmiot: przypisanie.przedmiotId,
            klasa: przypisanie.klasaId,
            nauczyciel: przypisanie.nauczycielId,
            godzinyTygodniowo: przypisanie.godzinyTygodniowo,
            godzinyRoczne: przypisanie.godzinyRoczne,
            semestr_1: Math.floor(przypisanie.godzinyRoczne / 2),
            semestr_2: Math.ceil(przypisanie.godzinyRoczne / 2),
            rok_szkolny: '2024/2025',
          },
        });
      }

      udane++;
    } catch (error) {
      console.error(`Błąd przy zapisie przypisania ${przypisanie.zadanieId}:`, error);
      nieudane++;
    }
  }

  console.log(`Zapisano: ${udane} przypisań`);
  console.log(`Błędy: ${nieudane} przypisań`);
}

/**
 * PRZYKŁAD 4: Analiza braków kadrowych
 */
export async function przyklad4_AnalizaBrakow(payload: Payload) {
  const wynik = await automatycznyRozdzialGodzin(payload, {
    rokSzkolny: '2024/2025',
  });

  if (wynik.brakiKadrowe.length === 0) {
    console.log('✅ Brak braków kadrowych!');
    return;
  }

  console.log(`\n=== ANALIZA BRAKÓW KADROWYCH ===\n`);
  console.log(`Łącznie braków: ${wynik.brakiKadrowe.length}\n`);

  // Grupuj według przedmiotu
  const brakiWedlugPrzedmiotu = new Map<string, BrakKadrowy[]>();
  wynik.brakiKadrowe.forEach(brak => {
    if (!brakiWedlugPrzedmiotu.has(brak.przedmiotId)) {
      brakiWedlugPrzedmiotu.set(brak.przedmiotId, []);
    }
    brakiWedlugPrzedmiotu.get(brak.przedmiotId)!.push(brak);
  });

  console.log('Braki według przedmiotu:');
  brakiWedlugPrzedmiotu.forEach((braki, przedmiotId) => {
    const przedmiot = braki[0];
    const sumaGodzin = braki.reduce((sum, b) => sum + b.godzinyTygodniowo, 0);
    console.log(`\n  ${przedmiot.przedmiotNazwa}:`);
    console.log(`    Liczba klas: ${braki.length}`);
    console.log(`    Suma godzin: ${sumaGodzin} tyg (${sumaGodzin * 30} rocznie)`);
    console.log(`    Powód: ${przedmiot.powod}`);
    
    if (przedmiot.dostepniNauczyciele > 0) {
      console.log(`    💡 Rozwiązanie: Zwiększ obciążenie ${przedmiot.dostepniNauczyciele} nauczycieli`);
    } else {
      console.log(`    💡 Rozwiązanie: Zatrudnij nowego nauczyciela lub dodaj kwalifikacje`);
    }
  });

  // Oblicz łączne zapotrzebowanie
  const laczneGodziny = wynik.brakiKadrowe.reduce(
    (sum, b) => sum + b.godzinyTygodniowo,
    0
  );
  console.log(`\nŁączne zapotrzebowanie: ${laczneGodziny} godzin tygodniowo`);
  console.log(`To odpowiada ${Math.ceil(laczneGodziny / 18)} pełnym etatom`);
}

/**
 * PRZYKŁAD 5: Porównanie przed i po optymalizacji
 */
export async function przyklad5_Porownanie(payload: Payload) {
  // Przed optymalizacją
  const przed = await automatycznyRozdzialGodzin(payload, {
    rokSzkolny: '2024/2025',
    preferujKontynuacje: false, // Nie preferuj kontynuacji
  });

  // Po optymalizacji (z preferencją kontynuacji)
  const po = await automatycznyRozdzialGodzin(payload, {
    rokSzkolny: '2024/2025',
    preferujKontynuacje: true, // Preferuj kontynuację
  });

  console.log('=== PORÓWNANIE ===\n');

  console.log('Współczynnik wyrównania:');
  console.log(`  Przed: ${(przed.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%`);
  console.log(`  Po: ${(po.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%`);
  console.log(`  Poprawa: ${((po.metryki.wspolczynnikWyrównania - przed.metryki.wspolczynnikWyrównania) * 100).toFixed(1)}%`);

  console.log('\nOdchylenie standardowe:');
  console.log(`  Przed: ${przed.metryki.odchylenieStandardowe.toFixed(2)}`);
  console.log(`  Po: ${po.metryki.odchylenieStandardowe.toFixed(2)}`);
  console.log(`  Poprawa: ${(przed.metryki.odchylenieStandardowe - po.metryki.odchylenieStandardowe).toFixed(2)}`);

  console.log('\nBraki kadrowe:');
  console.log(`  Przed: ${przed.brakiKadrowe.length}`);
  console.log(`  Po: ${po.brakiKadrowe.length}`);
}
