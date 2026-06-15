/**
 * Test izolacji per-konto dla tras dashboard/export NA ŻYWO (dev).
 * Dowodzi, że userId przepływa przez rdzeń (utils) i ogranicza wyniki do konta.
 * Rejestruje konta A, B; A tworzy nauczyciela; sprawdza:
 *  - dashboard/obciazenie-nauczycieli bez logowania => 401
 *  - inne trasy dashboard (podsumowanie/zgodnosc/braki/wskaznik) + export bez auth => 401
 *  - A widzi swojego nauczyciela w obciążeniach
 *  - B NIE widzi nauczyciela konta A (kluczowe — izolacja przez rdzeń)
 * Uruchom przy działającym `npm run dev`:  node scripts/test-izolacja-dashboard.cjs
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
async function getStatus(path, cookie) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(`${BASE}${path}`, { headers });
  return r.status;
}

(async () => {
  const ts = Date.now();
  const A = { email: `dash-a-${ts}@test.local`, password: 'haslo1234', imie: 'Konto', nazwisko: 'A' };
  const B = { email: `dash-b-${ts}@test.local`, password: 'haslo1234', imie: 'Konto', nazwisko: 'B' };
  const fails = [];

  await post('/api/auth/register', A);
  await post('/api/auth/register', B);
  const cookieA = cookieFrom(await post('/api/auth/login', { email: A.email, password: A.password, rememberMe: true }));
  const cookieB = cookieFrom(await post('/api/auth/login', { email: B.email, password: B.password, rememberMe: true }));
  if (!cookieA) fails.push('login A bez cookie');
  if (!cookieB) fails.push('login B bez cookie');

  // 1. Wszystkie trasy dashboard/export wymagają auth => 401 dla anonima
  const trasyAuth = [
    '/api/dashboard/obciazenie-nauczycieli?rokSzkolny=2024/2025',
    '/api/dashboard/podsumowanie?typSzkolyId=1&rokSzkolny=2024/2025',
    '/api/dashboard/zgodnosc-mein?typSzkolyId=1&rokSzkolny=2024/2025',
    '/api/dashboard/braki-kadrowe?typSzkolyId=1&rokSzkolny=2024/2025',
    '/api/dashboard/alerty?typSzkolyId=1&rokSzkolny=2024/2025',
    '/api/dashboard/wskaznik-ryzyka?typSzkolyId=1&rokSzkolny=2024/2025',
    '/api/export/xls?typSzkolyId=1&rokSzkolny=2024/2025',
  ];
  for (const t of trasyAuth) {
    const s = await getStatus(t, null);
    if (s !== 401) fails.push(`anon ${t} = ${s}, oczekiwano 401`);
  }

  // 2. A tworzy nauczyciela
  const created = await post('/api/nauczyciele', { imie: 'Dash', nazwisko: `Wlasciciel-${ts}` }, cookieA);
  const createdBody = await created.json().catch(() => null);
  if (created.status !== 200) fails.push(`POST nauczyciela (A) = ${created.status}`);
  const newId = createdBody && createdBody.id;
  const nazwiskoA = `Wlasciciel-${ts}`;

  // 3. A widzi swojego nauczyciela w obciążeniach; B nie
  const aObc = await getJson('/api/dashboard/obciazenie-nauczycieli?rokSzkolny=2024/2025', cookieA);
  if (aObc.status !== 200) fails.push(`obciazenie (A) = ${aObc.status}`);
  const aList = Array.isArray(aObc.body?.obciazenia) ? aObc.body.obciazenia : [];
  const aSees = aList.some((o) => String(o.nauczycielId) === String(newId) || String(o.nauczycielNazwa || '').includes(nazwiskoA));
  if (!aSees) fails.push('A nie widzi własnego nauczyciela w dashboard/obciazenie-nauczycieli');

  const bObc = await getJson('/api/dashboard/obciazenie-nauczycieli?rokSzkolny=2024/2025', cookieB);
  if (bObc.status !== 200) fails.push(`obciazenie (B) = ${bObc.status}`);
  const bListArr = Array.isArray(bObc.body?.obciazenia) ? bObc.body.obciazenia : [];
  const bSees = bListArr.some((o) => String(o.nauczycielId) === String(newId) || String(o.nauczycielNazwa || '').includes(nazwiskoA));
  if (bSees) fails.push('IZOLACJA ZŁAMANA: konto B widzi nauczyciela konta A w dashboard');

  console.log(JSON.stringify({ createdId: newId, aCount: aList.length, bCount: bListArr.length, aSees, bSees, fails }, null, 2));
  console.log(fails.length === 0 ? '✅ IZOLACJA DASHBOARD OK' : '❌ FAILS: ' + fails.length);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('Błąd testu:', e.message);
  process.exit(1);
});
