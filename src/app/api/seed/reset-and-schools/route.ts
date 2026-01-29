import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/** Kolejność usuwania (zależności FK): najpierw zależne, na końcu typy-szkol, przedmioty, nauczyciele. */
const COLLECTIONS_TO_CLEAR = [
  'rozkład-godzin',
  'siatki-godzin-mein',
  'kwalifikacje',
  'klasy',
  'zawody',
  'mapowania-nazw',
  'nauczyciele',
  'przedmioty',
  'typy-szkol',
] as const;

/** Typy szkół z ramowych planów MEiN (nazwa → liczba_lat, kod_mein). */
const SCHOOLS_FROM_PLANS: { nazwa: string; liczba_lat: number; kod_mein: string }[] = [
  { nazwa: 'Szkoła podstawowa, klasy I–III', liczba_lat: 3, kod_mein: 'SP-I-III' },
  { nazwa: 'Szkoła podstawowa, klasy IV–VIII', liczba_lat: 5, kod_mein: 'SP-IV-VIII' },
  { nazwa: 'Oddziały przysposabiające do pracy', liczba_lat: 2, kod_mein: 'OP' },
  { nazwa: 'Liceum ogólnokształcące', liczba_lat: 4, kod_mein: 'LO' },
  { nazwa: 'Technikum', liczba_lat: 5, kod_mein: 'T' },
  { nazwa: 'Branżowa szkoła I stopnia', liczba_lat: 3, kod_mein: 'BS1' },
  { nazwa: 'Liceum ogólnokształcące dla dorosłych', liczba_lat: 4, kod_mein: 'LO-D' },
];

/**
 * POST /api/seed/reset-and-schools
 * Usuwa wszystkie dane testowe (rozkład, siatki, kwalifikacje, klasy, zawody, mapowania, nauczyciele, przedmioty, typy szkół),
 * następnie dodaje typy szkół z ramowych planów MEiN.
 * Tylko w NODE_ENV !== 'production'.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Reset i seed szkół dostępny tylko w środowisku deweloperskim' },
      { status: 403 }
    );
  }

  try {
    const payload = await getPayload({ config });

    async function deleteAllInCollection(collection: string): Promise<number> {
      let total = 0;
      for (;;) {
        const res = await payload.find({
          collection: collection as any,
          limit: 200,
        });
        if (res.docs.length === 0) break;
        for (const doc of res.docs) {
          await payload.delete({
            collection: collection as any,
            id: doc.id,
          });
          total++;
        }
      }
      return total;
    }

    console.log('🧹 Usuwanie danych testowych...\n');
    const deleted: Record<string, number> = {};

    for (const coll of COLLECTIONS_TO_CLEAR) {
      const n = await deleteAllInCollection(coll);
      deleted[coll] = n;
      if (n > 0) console.log(`   ${coll}: usunięto ${n}`);
    }

    console.log('\n🏫 Dodawanie typów szkół z ramowych planów MEiN...\n');
    const created: { nazwa: string; kod_mein: string }[] = [];

    for (const s of SCHOOLS_FROM_PLANS) {
      await payload.create({
        collection: 'typy-szkol',
        data: {
          nazwa: s.nazwa,
          liczba_lat: s.liczba_lat,
          kod_mein: s.kod_mein,
        },
      });
      created.push({ nazwa: s.nazwa, kod_mein: s.kod_mein });
      console.log(`   ✅ ${s.nazwa} (${s.kod_mein})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Dane testowe usunięte, typy szkół z planów MEiN dodane.',
      deleted,
      schoolsCreated: created.length,
      schools: created,
    });
  } catch (error) {
    console.error('Błąd reset-and-schools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
