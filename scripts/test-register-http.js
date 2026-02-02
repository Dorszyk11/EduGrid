/**
 * Test rejestracji przez HTTP – uruchom gdy serwer działa (npm run dev).
 * Pokazuje dokładną odpowiedź/ błąd API.
 *
 * W jednym terminalu: npm run dev
 * W drugim: node scripts/test-register-http.js
 */

const url = process.env.REGISTER_URL || 'http://localhost:3000/api/auth/register';
const body = {
  email: `test-${Date.now()}@example.com`,
  password: 'haslo1234',
  imie: 'Jan',
  nazwisko: 'Kowalski',
};

async function main() {
  console.log('POST', url);
  console.log('Body:', JSON.stringify(body, null, 2));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
