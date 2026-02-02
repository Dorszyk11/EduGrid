/**
 * Test rejestracji – uruchom: npm test
 * Payload jest mockowany; do testu na żywo API uruchom serwer i: node scripts/test-register-http.js
 */
import { NextRequest } from 'next/server';

jest.mock('payload', () => ({
  getPayload: jest.fn(() =>
    Promise.resolve({
      find: jest.fn(() => Promise.resolve({ docs: [] })),
      create: jest.fn(() => Promise.resolve({})),
    })
  ),
}));

jest.mock('@/payload.config', () => ({ __esModule: true, default: {} }));

import { POST } from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const validBody = {
    email: uniqueEmail,
    password: 'haslo1234',
    imie: 'Jan',
    nazwisko: 'Kowalski',
  };

  function req(body: object) {
    return new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('zwraca 400 gdy brak email lub hasła', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it('zwraca 400 gdy brak imienia lub nazwiska', async () => {
    const res = await POST(req({ email: 'a@b.pl', password: 'haslo1234' }));
    expect(res.status).toBe(400);
  });

  it('zwraca 400 gdy hasło za krótkie', async () => {
    const res = await POST(req({ ...validBody, password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('tworzy użytkownika (mock) i zwraca 200', async () => {
    const res = await POST(req(validBody));
    const data = await res.json().catch(() => ({}));
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
