/**
 * Test izolacji per-konto NA ŻYWO (dev). Dowód, że P0-1 działa, a nie „na słowo honoru".
 * Rejestruje 2 konta (A, B), A tworzy nauczyciela, sprawdza że:
 *  - GET bez logowania => 401
 *  - A widzi swojego nauczyciela
 *  - B NIE widzi nauczyciela konta A (kluczowe)
 * Uruchom przy działającym `npm run dev`:  node scripts/test-izolacja-nauczyciele.cjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function cookieFrom(res) {
  const list =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
  const m = list.join('; ').match(/payload-token=([^;]+)/);
  return m ? `payload-token=${m[1]}` : null;
}

async function post(path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}
async function getJson(path, cookie) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(`${BASE}${path}`, { headers });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  const ts = Date.now();
  const A = { email: `izolacja-a-${ts}@test.local`, password: 'haslo1234', imie: 'Konto', nazwisko: 'A' };
  const B = { email: `izolacja-b-${ts}@test.local`, password: 'haslo1234', imie: 'Konto', nazwisko: 'B' };
  const fails = [];

  await post('/api/auth/register', A);
  await post('/api/auth/register', B);

  const loginA = await post('/api/auth/login', { email: A.email, password: A.password, rememberMe: true });
  const loginB = await post('/api/auth/login', { email: B.email, password: B.password, rememberMe: true });
  const cookieA = cookieFrom(loginA);
  const cookieB = cookieFrom(loginB);
  if (!cookieA) fails.push(`login A nie dał cookie (status ${loginA.status})`);
  if (!cookieB) fails.push(`login B nie dał cookie (status ${loginB.status})`);

  const anon = await getJson('/api/nauczyciele', null);
  if (anon.status !== 401) fails.push(`GET /api/nauczyciele bez auth = ${anon.status}, oczekiwano 401`);

  const created = await post('/api/nauczyciele', { imie: 'Jan', nazwisko: `Wlasciciel-${ts}` }, cookieA);
  const createdBody = await created.json().catch(() => null);
  if (created.status !== 200) fails.push(`POST nauczyciela (A) = ${created.status} (kolumna wlasciciel_id istnieje?)`);
  const newId = createdBody && createdBody.id;

  const aList = await getJson('/api/nauczyciele', cookieA);
  if (aList.status !== 200) fails.push(`GET (A) = ${aList.status}`);
  const aSees = Array.isArray(aList.body) && aList.body.some((n) => String(n.id) === String(newId));
  if (!aSees) fails.push('A nie widzi własnego nauczyciela');

  const bList = await getJson('/api/nauczyciele', cookieB);
  if (bList.status !== 200) fails.push(`GET (B) = ${bList.status}`);
  const bSees = Array.isArray(bList.body) && bList.body.some((n) => String(n.id) === String(newId));
  if (bSees) fails.push('IZOLACJA ZŁAMANA: konto B widzi nauczyciela konta A');

  console.log(JSON.stringify({ anonStatus: anon.status, createApi: created.status, createdId: newId, aSees, bSees, fails }, null, 2));
  console.log(fails.length === 0 ? '✅ IZOLACJA OK' : '❌ FAILS: ' + fails.length);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('Błąd testu:', e.message);
  process.exit(1);
});
