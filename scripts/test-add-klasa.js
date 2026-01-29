/**
 * Skrypt testowy: POST /api/klasy + GET /api/klasy
 * Uruchom: node scripts/test-add-klasa.js (gdy serwer działa: npm run dev)
 */
const BASE = process.env.API_BASE || 'http://localhost:3000';

async function test() {
  try {
    const r1 = await fetch(`${BASE}/api/typy-szkol`);
    const typy = await r1.json();
    if (!Array.isArray(typy) || typy.length === 0) {
      console.log('Brak typów szkół – dodaj typ w panelu admina.');
      process.exit(1);
    }
    const typId = typy[0].id;
    console.log('Typ szkoły ID:', typId, typy[0].nazwa);

    const body = {
      typ_szkoly_id: typId,
      rok_poczatku: 2022,
      litera: 'T',
      profil: 'test',
    };
    const r2 = await fetch(`${BASE}/api/klasy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r2.json();
    console.log('POST /api/klasy status:', r2.status);
    console.log('POST response:', JSON.stringify(data, null, 2));
    if (!r2.ok) {
      console.log('Błąd:', data.error);
      process.exit(1);
    }

    const r3 = await fetch(`${BASE}/api/klasy?rokSzkolny=2024/2025`);
    const list = await r3.json();
    console.log('GET /api/klasy (rok 2024/2025):', list.klasy?.length ?? 0, 'klas');
    if (list.klasy?.some((k) => k.nazwa === 'T')) {
      console.log('OK – klasa T jest na liście.');
    } else {
      console.log('Lista nazw klas:', list.klasy?.map((k) => k.nazwa) ?? []);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

test();
