import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import crypto from 'crypto';
import { Pool } from 'pg';
import { getDbSslConfig } from '@/lib/dbSsl';

/** Pierwsza inicjalizacja Payload bywa bardzo wolna – po 8 s używamy zapisu bezpośrednio do bazy. */
const PAYLOAD_TIMEOUT_MS = 8_000;
const OPERATION_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function getConnectionString(): string | undefined {
  const uri = process.env.DATABASE_URI;
  if (!uri) return undefined;
  if (uri.includes('pooler.supabase.com') && uri.includes(':5432/')) {
    return uri.replace(':5432/', ':6543/');
  }
  return uri;
}

/** Hash hasła tak jak Payload (pbkdf2, 25000, 512, sha256). */
async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuffer = await new Promise<Buffer>((resolve, reject) =>
    crypto.randomBytes(32, (err, buf) => (err ? reject(err) : resolve(buf)))
  );
  const salt = saltBuffer.toString('hex');
  const hashRaw = await new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, buf) => (err ? reject(err) : resolve(buf)))
  );
  return { hash: hashRaw.toString('hex'), salt };
}

/** Rejestracja bezpośrednio do Postgres (gdy getPayload się zawiesza). Kolumny dobierane wg schemy. */
async function registerViaDb(email: string, password: string, imie: string, nazwisko: string): Promise<void> {
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error('Brak DATABASE_URI w konfiguracji.');
  const pool = new Pool({
    connectionString,
    ssl: getDbSslConfig(connectionString),
  });
  const client = await pool.connect();
  try {
    // Próba dodania brakujących kolumn (może się nie udać np. przy braku uprawnień)
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS imie TEXT');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nazwisko TEXT');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT');
    } catch {
      // ignoruj błędy ALTER (np. brak uprawnień w Supabase pooler)
    }

    const { hash, salt } = await hashPassword(password);
    const check = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (check.rows.length > 0) throw new Error('Konto z tym adresem email już istnieje.');

    // Pobierz listę kolumn tabeli users (działa niezależnie od schemy Payload/Drizzle)
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users'`
    );
    const existing = new Set((cols.rows as { column_name: string }[]).map((r) => r.column_name));

    const want: Array<{ col: string; val: string }> = [
      { col: 'email', val: email.toLowerCase() },
      { col: 'hash', val: hash },
      { col: 'salt', val: salt },
    ];
    if (existing.has('imie')) want.push({ col: 'imie', val: imie });
    if (existing.has('nazwisko')) want.push({ col: 'nazwisko', val: nazwisko });
    if (existing.has('role')) want.push({ col: 'role', val: 'sekretariat' });

    const columns = want.map((w) => w.col).join(', ');
    const placeholders = want.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `INSERT INTO users (${columns}) VALUES (${placeholders})`,
      want.map((w) => w.val)
    );
  } finally {
    client.release();
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const imie = typeof body.imie === 'string' ? body.imie.trim() : '';
    const nazwisko = typeof body.nazwisko === 'string' ? body.nazwisko.trim() : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Podaj email i hasło.' },
        { status: 400 }
      );
    }
    if (!imie || !nazwisko) {
      return NextResponse.json(
        { error: 'Podaj imię i nazwisko.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Hasło musi mieć co najmniej 8 znaków.' },
        { status: 400 }
      );
    }

    let usedPayload = false;
    try {
      const payload = await withTimeout(
        getPayload({ config }),
        PAYLOAD_TIMEOUT_MS,
        'timeout'
      );
      usedPayload = true;
      const existing = await withTimeout(
        payload.find({
          collection: 'users',
          where: { email: { equals: email.toLowerCase() } },
          limit: 1,
          overrideAccess: true,
        }),
        OPERATION_TIMEOUT_MS,
        'Sprawdzenie duplikatu email przekroczyło limit czasu.'
      );
      if (existing.docs.length > 0) {
        return NextResponse.json(
          { error: 'Konto z tym adresem email już istnieje.' },
          { status: 409 }
        );
      }
      await withTimeout(
        payload.create({
          collection: 'users',
          data: {
            email: email.toLowerCase(),
            password,
            imie,
            nazwisko,
            role: 'sekretariat',
          },
          overrideAccess: true,
        }),
        OPERATION_TIMEOUT_MS,
        'Zapis użytkownika przekroczył limit czasu.'
      );
    } catch (payloadErr: unknown) {
      const isTimeout = payloadErr instanceof Error && payloadErr.message === 'timeout';
      if (!isTimeout && usedPayload) throw payloadErr;
      await registerViaDb(email, password, imie, nazwisko);
    }

    return NextResponse.json({ ok: true, message: 'Konto utworzone. Możesz się zalogować.' });
  } catch (err: unknown) {
    let message = 'Rejestracja nie powiodła się.';
    if (err && typeof err === 'object') {
      const e = err as { message?: string; errors?: Array<{ message?: string }>; data?: { errors?: Array<{ message?: string }> } };
      if (typeof e.message === 'string' && e.message) message = e.message;
      const errors = e.errors ?? e.data?.errors;
      if (Array.isArray(errors) && errors[0]?.message) message = errors[0].message;
    }
    console.error('Register error:', err);
    const status = message === 'Konto z tym adresem email już istnieje.' ? 409 : 500;
    const body: { error: string; detail?: string } = { error: message };
    if (process.env.NODE_ENV === 'development' && err instanceof Error) {
      body.detail = err.message;
    }
    return NextResponse.json(body, { status });
  }
}
