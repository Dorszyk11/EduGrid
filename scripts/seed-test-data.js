/**
 * Skrypt do wypełnienia bazy danych testowymi danymi (JavaScript)
 * Uruchom: node scripts/seed-test-data.js
 * 
 * Wymaga: PAYLOAD_CONFIG_PATH=src/payload.config.ts node scripts/seed-test-data.js
 */

require('dotenv').config();
const { getPayload } = require('payload');

// Dynamiczny import konfiguracji
async function loadConfig() {
  // W Node.js z ESM, możemy użyć dynamicznego importu
  const configModule = await import('../src/payload.config.js');
  return configModule.default;
}

async function seedTestData() {
  try {
    // Załaduj konfigurację
    const config = await loadConfig();
    const payload = await getPayload({ config });

    console.log('🌱 Rozpoczynam wypełnianie bazy danymi testowymi...\n');

    // 1. Typy szkół
    console.log('1. Dodawanie typów szkół...');
    const typySzkol = await Promise.all([
      payload.create({
        collection: 'typy-szkol',
        data: {
          nazwa: 'Liceum ogólnokształcące',
          liczba_lat: 4,
          kod_mein: 'LO',
        },
      }),
      payload.create({
        collection: 'typy-szkol',
        data: {
          nazwa: 'Technikum',
          liczba_lat: 5,
          kod_mein: 'T',
        },
      }),
      payload.create({
        collection: 'typy-szkol',
        data: {
          nazwa: 'Branżowa szkoła I stopnia',
          liczba_lat: 3,
          kod_mein: 'BS1',
        },
      }),
    ]);
    console.log(`✅ Dodano ${typySzkol.length} typów szkół\n`);

    // 2. Przedmioty
    console.log('2. Dodawanie przedmiotów...');
    const przedmioty = await Promise.all([
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Język polski',
          kod_mein: 'JP',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Matematyka',
          kod_mein: 'MAT',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Język angielski',
          kod_mein: 'JA',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Historia',
          kod_mein: 'HIS',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Biologia',
          kod_mein: 'BIO',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Chemia',
          kod_mein: 'CHE',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Fizyka',
          kod_mein: 'FIZ',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Informatyka',
          kod_mein: 'INF',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Geografia',
          kod_mein: 'GEO',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Wiedza o społeczeństwie',
          kod_mein: 'WOS',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'podstawowy',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Wychowanie fizyczne',
          kod_mein: 'WF',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'brak',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Matematyka - rozszerzona',
          kod_mein: 'MAT-R',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'rozszerzony',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'przedmioty',
        data: {
          nazwa: 'Biologia - rozszerzona',
          kod_mein: 'BIO-R',
          typ_zajec: 'ogolnoksztalcace',
          poziom: 'rozszerzony',
          aktywny: true,
        },
      }),
    ]);
    console.log(`✅ Dodano ${przedmioty.length} przedmiotów\n`);

    // 3. Nauczyciele
    console.log('3. Dodawanie nauczycieli...');
    const nauczyciele = await Promise.all([
      payload.create({
        collection: 'nauczyciele',
        data: {
          imie: 'Anna',
          nazwisko: 'Kowalska',
          email: 'anna.kowalska@szkola.pl',
          telefon: '+48 123 456 789',
          max_obciazenie: 18,
          etat: 'pełny',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'nauczyciele',
        data: {
          imie: 'Jan',
          nazwisko: 'Nowak',
          email: 'jan.nowak@szkola.pl',
          telefon: '+48 123 456 790',
          max_obciazenie: 18,
          etat: 'pełny',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'nauczyciele',
        data: {
          imie: 'Maria',
          nazwisko: 'Wiśniewska',
          email: 'maria.wisniewska@szkola.pl',
          telefon: '+48 123 456 791',
          max_obciazenie: 18,
          etat: 'pełny',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'nauczyciele',
        data: {
          imie: 'Piotr',
          nazwisko: 'Zieliński',
          email: 'piotr.zielinski@szkola.pl',
          telefon: '+48 123 456 792',
          max_obciazenie: 18,
          etat: 'pełny',
          aktywny: true,
        },
      }),
      payload.create({
        collection: 'nauczyciele',
        data: {
          imie: 'Katarzyna',
          nazwisko: 'Szymańska',
          email: 'katarzyna.szymanska@szkola.pl',
          telefon: '+48 123 456 793',
          max_obciazenie: 9,
          etat: 'pół',
          aktywny: true,
        },
      }),
    ]);
    console.log(`✅ Dodano ${nauczyciele.length} nauczycieli\n`);

    // 4. Kwalifikacje
    console.log('4. Dodawanie kwalifikacji...');
    const kwalifikacje = await Promise.all([
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[0].id,
          przedmiot: przedmioty[0].id,
          stopien: 'magister',
          specjalizacja: 'Filologia polska',
          data_uzyskania: '2010-06-30',
        },
      }),
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[1].id,
          przedmiot: przedmioty[1].id,
          stopien: 'magister',
          specjalizacja: 'Matematyka',
          data_uzyskania: '2012-06-30',
        },
      }),
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[1].id,
          przedmiot: przedmioty[11].id,
          stopien: 'magister',
          specjalizacja: 'Matematyka',
          data_uzyskania: '2012-06-30',
        },
      }),
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[2].id,
          przedmiot: przedmioty[2].id,
          stopien: 'magister',
          specjalizacja: 'Filologia angielska',
          data_uzyskania: '2011-06-30',
        },
      }),
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[3].id,
          przedmiot: przedmioty[3].id,
          stopien: 'magister',
          specjalizacja: 'Historia',
          data_uzyskania: '2013-06-30',
        },
      }),
      payload.create({
        collection: 'kwalifikacje',
        data: {
          nauczyciel: nauczyciele[4].id,
          przedmiot: przedmioty[4].id,
          stopien: 'magister',
          specjalizacja: 'Biologia',
          data_uzyskania: '2014-06-30',
        },
      }),
    ]);
    console.log(`✅ Dodano ${kwalifikacje.length} kwalifikacji\n`);

    // 5. Klasy
    console.log('5. Dodawanie klas...');
    const klasy = await Promise.all([
      payload.create({
        collection: 'klasy',
        data: {
          nazwa: '1A',
          typ_szkoly: typySzkol[0].id,
          rok_szkolny: '2024/2025',
          numer_klasy: 1,
          profil: 'matematyczno-fizyczny',
        },
      }),
      payload.create({
        collection: 'klasy',
        data: {
          nazwa: '1B',
          typ_szkoly: typySzkol[0].id,
          rok_szkolny: '2024/2025',
          numer_klasy: 1,
          profil: 'biologiczno-chemiczny',
        },
      }),
      payload.create({
        collection: 'klasy',
        data: {
          nazwa: '2A',
          typ_szkoly: typySzkol[0].id,
          rok_szkolny: '2024/2025',
          numer_klasy: 2,
          profil: 'matematyczno-fizyczny',
        },
      }),
    ]);
    console.log(`✅ Dodano ${klasy.length} klas\n`);

    // 6. Siatki godzin MEiN
    console.log('6. Dodawanie siatek godzin MEiN...');
    const siatkiMein = await Promise.all([
      payload.create({
        collection: 'siatki-godzin-mein',
        data: {
          przedmiot: przedmioty[0].id,
          typ_szkoly: typySzkol[0].id,
          klasa: null,
          godziny_w_cyklu: 360,
          godziny_tygodniowo_min: 4,
          godziny_tygodniowo_max: 4,
          obowiazkowe: true,
          data_obowiazywania_od: '2024-09-01',
        },
      }),
      payload.create({
        collection: 'siatki-godzin-mein',
        data: {
          przedmiot: przedmioty[1].id,
          typ_szkoly: typySzkol[0].id,
          klasa: null,
          godziny_w_cyklu: 360,
          godziny_tygodniowo_min: 4,
          godziny_tygodniowo_max: 4,
          obowiazkowe: true,
          data_obowiazywania_od: '2024-09-01',
        },
      }),
      payload.create({
        collection: 'siatki-godzin-mein',
        data: {
          przedmiot: przedmioty[2].id,
          typ_szkoly: typySzkol[0].id,
          klasa: null,
          godziny_w_cyklu: 450,
          godziny_tygodniowo_min: 3,
          godziny_tygodniowo_max: 3,
          obowiazkowe: true,
          data_obowiazywania_od: '2024-09-01',
        },
      }),
      payload.create({
        collection: 'siatki-godzin-mein',
        data: {
          przedmiot: przedmioty[3].id,
          typ_szkoly: typySzkol[0].id,
          klasa: null,
          godziny_w_cyklu: 60,
          godziny_tygodniowo_min: 2,
          godziny_tygodniowo_max: 2,
          obowiazkowe: true,
          data_obowiazywania_od: '2024-09-01',
        },
      }),
    ]);
    console.log(`✅ Dodano ${siatkiMein.length} siatek godzin MEiN\n`);

    // 7. Rozkład godzin
    console.log('7. Dodawanie rozkładu godzin...');
    const rozkladGodzin = await Promise.all([
      payload.create({
        collection: 'rozkład-godzin',
        data: {
          przedmiot: przedmioty[0].id,
          klasa: klasy[0].id,
          nauczyciel: nauczyciele[0].id,
          rok_szkolny: '2024/2025',
          godziny_tyg: 4,
          godziny_roczne: 120,
        },
      }),
      payload.create({
        collection: 'rozkład-godzin',
        data: {
          przedmiot: przedmioty[1].id,
          klasa: klasy[0].id,
          nauczyciel: nauczyciele[1].id,
          rok_szkolny: '2024/2025',
          godziny_tyg: 4,
          godziny_roczne: 120,
        },
      }),
      payload.create({
        collection: 'rozkład-godzin',
        data: {
          przedmiot: przedmioty[2].id,
          klasa: klasy[0].id,
          nauczyciel: nauczyciele[2].id,
          rok_szkolny: '2024/2025',
          godziny_tyg: 3,
          godziny_roczne: 90,
        },
      }),
      payload.create({
        collection: 'rozkład-godzin',
        data: {
          przedmiot: przedmioty[11].id,
          klasa: klasy[0].id,
          nauczyciel: nauczyciele[1].id,
          rok_szkolny: '2024/2025',
          godziny_tyg: 6,
          godziny_roczne: 180,
        },
      }),
    ]);
    console.log(`✅ Dodano ${rozkladGodzin.length} rekordów rozkładu godzin\n`);

    console.log('✅ Wszystkie dane testowe zostały dodane pomyślnie!');
    console.log('\n📊 Podsumowanie:');
    console.log(`   - Typy szkół: ${typySzkol.length}`);
    console.log(`   - Przedmioty: ${przedmioty.length}`);
    console.log(`   - Nauczyciele: ${nauczyciele.length}`);
    console.log(`   - Kwalifikacje: ${kwalifikacje.length}`);
    console.log(`   - Klasy: ${klasy.length}`);
    console.log(`   - Siatki godzin MEiN: ${siatkiMein.length}`);
    console.log(`   - Rozkład godzin: ${rozkladGodzin.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd podczas wypełniania bazy:', error);
    process.exit(1);
  }
}

// Uruchom
seedTestData();
