import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * API endpoint do wypełnienia bazy danymi testowymi
 * GET /api/seed - wypełnia bazę danymi testowymi
 * 
 * UWAGA: Tylko dla środowiska deweloperskiego!
 */
export async function GET() {
  // Sprawdź, czy to środowisko deweloperskie
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed jest dostępny tylko w środowisku deweloperskim' },
      { status: 403 }
    );
  }

  try {
    const payload = await getPayload({ config });

    console.log('🌱 Rozpoczynam wypełnianie bazy danymi testowymi...\n');

    // Helper function do tworzenia z obsługą duplikatów
    const createOrGet = async (collection: string, data: any, findKey: string) => {
      try {
        const existing = await payload.find({
          collection,
          where: {
            [findKey]: {
              equals: data[findKey],
            },
          },
          limit: 1,
        });

        if (existing.docs.length > 0) {
          return existing.docs[0];
        }

        return await payload.create({ collection, data });
      } catch (error: any) {
        // Jeśli błąd duplikatu, spróbuj znaleźć istniejący
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          const existing = await payload.find({
            collection,
            where: {
              [findKey]: {
                equals: data[findKey],
              },
            },
            limit: 1,
          });
          if (existing.docs.length > 0) {
            return existing.docs[0];
          }
        }
        throw error;
      }
    };

    // 1. Typy szkół
    console.log('1. Dodawanie typów szkół...');
    const typySzkol = [];
    const typyData = [
      { nazwa: 'Liceum ogólnokształcące', liczba_lat: 4, kod_mein: 'LO' },
      { nazwa: 'Technikum', liczba_lat: 5, kod_mein: 'T' },
      { nazwa: 'Branżowa szkoła I stopnia', liczba_lat: 3, kod_mein: 'BS1' },
    ];

    for (const typData of typyData) {
      const typ = await createOrGet('typy-szkol', typData, 'kod_mein');
      typySzkol.push(typ);
      console.log(`   ✅ ${typData.nazwa}`);
    }

    // 2. Przedmioty
    console.log('2. Dodawanie przedmiotów...');
    const przedmioty = [];
    const przedmiotyData = [
      { nazwa: 'Język polski', kod_mein: 'JP', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Matematyka', kod_mein: 'MAT', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Język angielski', kod_mein: 'JA', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Historia', kod_mein: 'HIS', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Biologia', kod_mein: 'BIO', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Chemia', kod_mein: 'CHE', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Fizyka', kod_mein: 'FIZ', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Informatyka', kod_mein: 'INF', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Geografia', kod_mein: 'GEO', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Wiedza o społeczeństwie', kod_mein: 'WOS', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy', aktywny: true },
      { nazwa: 'Wychowanie fizyczne', kod_mein: 'WF', typ_zajec: 'ogolnoksztalcace', poziom: 'brak', aktywny: true },
      { nazwa: 'Matematyka - rozszerzona', kod_mein: 'MAT-R', typ_zajec: 'ogolnoksztalcace', poziom: 'rozszerzony', aktywny: true },
      { nazwa: 'Biologia - rozszerzona', kod_mein: 'BIO-R', typ_zajec: 'ogolnoksztalcace', poziom: 'rozszerzony', aktywny: true },
    ];

    for (const przedmiotData of przedmiotyData) {
      const przedmiot = await createOrGet('przedmioty', przedmiotData, 'kod_mein');
      przedmioty.push(przedmiot);
    }
    console.log(`   ✅ Dodano ${przedmioty.length} przedmiotów\n`);

    // 3. Nauczyciele
    console.log('3. Dodawanie nauczycieli...');
    const nauczyciele = [];
    const nauczycieleData = [
      { imie: 'Anna', nazwisko: 'Kowalska', email: 'anna.kowalska@szkola.pl', telefon: '+48 123 456 789', max_obciazenie: 18, etat: 'pełny', aktywny: true },
      { imie: 'Jan', nazwisko: 'Nowak', email: 'jan.nowak@szkola.pl', telefon: '+48 123 456 790', max_obciazenie: 18, etat: 'pełny', aktywny: true },
      { imie: 'Maria', nazwisko: 'Wiśniewska', email: 'maria.wisniewska@szkola.pl', telefon: '+48 123 456 791', max_obciazenie: 18, etat: 'pełny', aktywny: true },
      { imie: 'Piotr', nazwisko: 'Zieliński', email: 'piotr.zielinski@szkola.pl', telefon: '+48 123 456 792', max_obciazenie: 18, etat: 'pełny', aktywny: true },
      { imie: 'Katarzyna', nazwisko: 'Szymańska', email: 'katarzyna.szymanska@szkola.pl', telefon: '+48 123 456 793', max_obciazenie: 9, etat: 'pół', aktywny: true },
    ];

    for (const nauczycielData of nauczycieleData) {
      const nauczyciel = await createOrGet('nauczyciele', nauczycielData, 'email');
      nauczyciele.push(nauczyciel);
    }
    console.log(`   ✅ Dodano ${nauczyciele.length} nauczycieli\n`);

    // 4. Kwalifikacje
    console.log('4. Dodawanie kwalifikacji...');
    const kwalifikacje = [];
    const kwalifikacjeData = [
      { nauczyciel: nauczyciele[0].id, przedmiot: przedmioty[0].id, stopien: 'magister', specjalizacja: 'Filologia polska', data_uzyskania: '2010-06-30' },
      { nauczyciel: nauczyciele[1].id, przedmiot: przedmioty[1].id, stopien: 'magister', specjalizacja: 'Matematyka', data_uzyskania: '2012-06-30' },
      { nauczyciel: nauczyciele[1].id, przedmiot: przedmioty[11].id, stopien: 'magister', specjalizacja: 'Matematyka', data_uzyskania: '2012-06-30' },
      { nauczyciel: nauczyciele[2].id, przedmiot: przedmioty[2].id, stopien: 'magister', specjalizacja: 'Filologia angielska', data_uzyskania: '2011-06-30' },
      { nauczyciel: nauczyciele[3].id, przedmiot: przedmioty[3].id, stopien: 'magister', specjalizacja: 'Historia', data_uzyskania: '2013-06-30' },
      { nauczyciel: nauczyciele[4].id, przedmiot: przedmioty[4].id, stopien: 'magister', specjalizacja: 'Biologia', data_uzyskania: '2014-06-30' },
    ];

    for (const kwalData of kwalifikacjeData) {
      // Sprawdź, czy kwalifikacja już istnieje
      const existing = await payload.find({
        collection: 'kwalifikacje',
        where: {
          and: [
            { nauczyciel: { equals: kwalData.nauczyciel } },
            { przedmiot: { equals: kwalData.przedmiot } },
          ],
        },
        limit: 1,
      });

      if (existing.docs.length === 0) {
        try {
          const created = await payload.create({
            collection: 'kwalifikacje',
            data: kwalData,
          });
          kwalifikacje.push(created);
        } catch (error: any) {
          console.error(`   ❌ Błąd przy dodawaniu kwalifikacji:`, error.message);
        }
      } else {
        kwalifikacje.push(existing.docs[0]);
      }
    }
    console.log(`   ✅ Dodano ${kwalifikacje.length} kwalifikacji\n`);

    // 5. Klasy
    console.log('5. Dodawanie klas...');
    const klasy = [];
    const klasyData = [
      { nazwa: '1A', typ_szkoly: typySzkol[0].id, rok_szkolny: '2024/2025', numer_klasy: 1, profil: 'matematyczno-fizyczny' },
      { nazwa: '1B', typ_szkoly: typySzkol[0].id, rok_szkolny: '2024/2025', numer_klasy: 1, profil: 'biologiczno-chemiczny' },
      { nazwa: '2A', typ_szkoly: typySzkol[0].id, rok_szkolny: '2024/2025', numer_klasy: 2, profil: 'matematyczno-fizyczny' },
    ];

    for (const klasaData of klasyData) {
      const klasa = await createOrGet('klasy', klasaData, 'nazwa');
      klasy.push(klasa);
    }
    console.log(`   ✅ Dodano ${klasy.length} klas\n`);

    // 6. Siatki godzin MEiN
    console.log('6. Dodawanie siatek godzin MEiN...');
    const siatkiMein = [];
    const siatkiData = [
      { przedmiot: przedmioty[0].id, typ_szkoly: typySzkol[0].id, klasa: null, godziny_w_cyklu: 360, godziny_tygodniowo_min: 4, godziny_tygodniowo_max: 4, obowiazkowe: true, data_obowiazywania_od: '2024-09-01' },
      { przedmiot: przedmioty[1].id, typ_szkoly: typySzkol[0].id, klasa: null, godziny_w_cyklu: 360, godziny_tygodniowo_min: 4, godziny_tygodniowo_max: 4, obowiazkowe: true, data_obowiazywania_od: '2024-09-01' },
      { przedmiot: przedmioty[2].id, typ_szkoly: typySzkol[0].id, klasa: null, godziny_w_cyklu: 450, godziny_tygodniowo_min: 3, godziny_tygodniowo_max: 3, obowiazkowe: true, data_obowiazywania_od: '2024-09-01' },
      { przedmiot: przedmioty[3].id, typ_szkoly: typySzkol[0].id, klasa: null, godziny_w_cyklu: 60, godziny_tygodniowo_min: 2, godziny_tygodniowo_max: 2, obowiazkowe: true, data_obowiazywania_od: '2024-09-01' },
    ];

    for (const siatkaData of siatkiData) {
      // Sprawdź, czy już istnieje
      const existing = await payload.find({
        collection: 'siatki-godzin-mein',
        where: {
          and: [
            { przedmiot: { equals: siatkaData.przedmiot } },
            { typ_szkoly: { equals: siatkaData.typ_szkoly } },
          ],
        },
        limit: 1,
      });

      if (existing.docs.length === 0) {
        try {
          const created = await payload.create({
            collection: 'siatki-godzin-mein',
            data: siatkaData,
          });
          siatkiMein.push(created);
        } catch (error: any) {
          console.error(`   ❌ Błąd przy dodawaniu siatki:`, error.message);
        }
      } else {
        siatkiMein.push(existing.docs[0]);
      }
    }
    console.log(`   ✅ Dodano ${siatkiMein.length} siatek godzin MEiN\n`);

    // 7. Rozkład godzin
    console.log('7. Dodawanie rozkładu godzin...');
    const rozkladGodzin = [];
    const rozkladData = [
      { przedmiot: przedmioty[0].id, klasa: klasy[0].id, nauczyciel: nauczyciele[0].id, rok_szkolny: '2024/2025', godziny_tyg: 4, godziny_roczne: 120 },
      { przedmiot: przedmioty[1].id, klasa: klasy[0].id, nauczyciel: nauczyciele[1].id, rok_szkolny: '2024/2025', godziny_tyg: 4, godziny_roczne: 120 },
      { przedmiot: przedmioty[2].id, klasa: klasy[0].id, nauczyciel: nauczyciele[2].id, rok_szkolny: '2024/2025', godziny_tyg: 3, godziny_roczne: 90 },
      { przedmiot: przedmioty[11].id, klasa: klasy[0].id, nauczyciel: nauczyciele[1].id, rok_szkolny: '2024/2025', godziny_tyg: 6, godziny_roczne: 180 },
    ];

    for (const rozkladItem of rozkladData) {
      // Sprawdź, czy już istnieje
      const existing = await payload.find({
        collection: 'rozkład-godzin',
        where: {
          and: [
            { przedmiot: { equals: rozkladItem.przedmiot } },
            { klasa: { equals: rozkladItem.klasa } },
            { nauczyciel: { equals: rozkladItem.nauczyciel } },
            { rok_szkolny: { equals: rozkladItem.rok_szkolny } },
          ],
        },
        limit: 1,
      });

      if (existing.docs.length === 0) {
        try {
          const created = await payload.create({
            collection: 'rozkład-godzin',
            data: rozkladItem,
          });
          rozkladGodzin.push(created);
        } catch (error: any) {
          console.error(`   ❌ Błąd przy dodawaniu rozkładu:`, error.message);
        }
      } else {
        rozkladGodzin.push(existing.docs[0]);
      }
    }
    console.log(`   ✅ Dodano ${rozkladGodzin.length} rekordów rozkładu godzin\n`);

    return NextResponse.json({
      success: true,
      message: 'Dane testowe zostały dodane pomyślnie',
      summary: {
        typySzkol: typySzkol.length,
        przedmioty: przedmioty.length,
        nauczyciele: nauczyciele.length,
        kwalifikacje: kwalifikacje.length,
        klasy: klasy.length,
        siatkiMein: siatkiMein.length,
        rozkladGodzin: rozkladGodzin.length,
      },
    });
  } catch (error) {
    console.error('Błąd podczas seedowania:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
