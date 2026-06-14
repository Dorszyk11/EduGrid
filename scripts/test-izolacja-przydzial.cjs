/**
 * Test izolacji zapisu przydziału (rozkład-godzin) NA ŻYWO.
 * Sprawdza, że nie da się zapisać do cudzej/nieistniejącej klasy.
 *  - POST bez logowania => 401
 *  - zalogowane konto, klasa do której nie ma dostępu => 403 (przed jakimkolwiek zapisem)
 * Uruchom przy działającym `npm run dev`:  node scripts/test-izolacja-przydzial.cjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

function cookieFrom(res) {
  const list =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
  const m = list.join("; ").match(/payload-token=([^;]+)/);
  return m ? `payload-token=${m[1]}` : null;
}
async function post(path, body, cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: r.status };
}

(async () => {
  const ts = Date.now();
  const A = { email: `przydzial-a-${ts}@test.local`, password: "haslo1234", imie: "Konto", nazwisko: "A" };
  const fails = [];

  await post("/api/auth/register", A);
  const loginA = await post("/api/auth/login", { email: A.email, password: A.password, rememberMe: true });
  // login zwraca cookie tylko z pełnej odpowiedzi — pobierzmy ją osobno
  const lr = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: A.email, password: A.password, rememberMe: true }),
  });
  const cookieA = cookieFrom(lr);
  if (!cookieA) fails.push(`login A bez cookie (status ${loginA.status})`);

  const fakePrzydzial = {
    rokSzkolny: "2024/2025",
    przypisania: [{ przedmiotId: 999999, klasaId: 999999, nauczycielId: 999999, godzinyTygodniowo: 2, godzinyRoczne: 60 }],
  };

  const anon = await post("/api/przydzial/zapisz", fakePrzydzial, null);
  if (anon.status !== 401) fails.push(`zapisz bez auth = ${anon.status}, oczekiwano 401`);

  const foreign = await post("/api/przydzial/zapisz", fakePrzydzial, cookieA);
  if (foreign.status !== 403) fails.push(`zapisz do nie-swojej klasy = ${foreign.status}, oczekiwano 403`);

  // dyspozycja/przydziel — izolacja przez surowy SQL (assertOwnedRaw)
  async function getStatus(path, cookie) {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    const r = await fetch(`${BASE}${path}`, { headers });
    return r.status;
  }
  const dispPath = "/api/dyspozycja/przydziel?klasaId=999999&rokSzkolny=2024/2025";
  const dispAnon = await getStatus(dispPath, null);
  if (dispAnon !== 401) fails.push(`dyspozycja GET bez auth = ${dispAnon}, oczekiwano 401`);
  const dispForeign = await getStatus(dispPath, cookieA);
  if (dispForeign !== 404) fails.push(`dyspozycja GET cudza klasa = ${dispForeign}, oczekiwano 404`);

  console.log(JSON.stringify({ anonStatus: anon.status, foreignStatus: foreign.status, dispAnon, dispForeign, fails }, null, 2));
  console.log(fails.length === 0 ? "✅ IZOLACJA ZAPISU OK" : "❌ FAILS: " + fails.length);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error("Błąd testu:", e.message);
  process.exit(1);
});
