import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { getPayloadSecretKey } from '@/utils/auth';

const COOKIE_NAME = 'payload-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dni
const PAYLOAD_TIMEOUT_MS = 10_000;

type DbQueryResult = { rows: Record<string, unknown>[] };
type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
  release: () => void;
};
type DbPool = {
  connect: () => Promise<DbClient>;
  end: () => Promise<void>;
};

function createDbPool(connectionString: string): DbPool {
  const { Pool } = require('pg') as {
    Pool: new (options: { connectionString: string; ssl?: { rejectUnauthorized: boolean } }) => DbPool;
  };
  return new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
}

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

/** Weryfikacja hasła tak jak Payload (pbkdf2, 25000, 512, sha256). */
function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, derived) => {
      if (err) return reject(err);
      resolve(derived.toString('hex') === hash);
    });
  });
}

/** Logowanie bezpośrednio z bazy + wystawienie JWT (gdy getPayload się zawiesza). */
async function loginViaDb(email: string, password: string): Promise<{ user: { id: string; email: string; imie?: string; nazwisko?: string }; token: string } | null> {
  const connectionString = getConnectionString();
  if (!connectionString) return null;
  const secret = getPayloadSecretKey();
  if (!secret) return null;

  const pool = createDbPool(connectionString);
  const client = await pool.connect();
  try {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users'`
    );
    const existing = new Set((cols.rows as { column_name: string }[]).map((r) => r.column_name));
    const needHash = existing.has('hash') && existing.has('salt');
    if (!needHash) return null;

    const selectCols = ['id', 'email', 'hash', 'salt'];
    if (existing.has('imie')) selectCols.push('imie');
    if (existing.has('nazwisko')) selectCols.push('nazwisko');

    const res = await client.query(
      `SELECT ${selectCols.join(', ')} FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [email.toLowerCase()]
    );
    if (res.rows.length === 0) return null;

    const row = res.rows[0] as Record<string, string>;
    const ok = await verifyPassword(password, row.salt, row.hash);
    if (!ok) return null;

    const user = {
      id: String(row.id),
      email: row.email,
      imie: row.imie,
      nazwisko: row.nazwisko,
    };
    const fieldsToSign: Record<string, unknown> = {
      id: row.id,
      collection: 'users',
      email: row.email,
    };
    if (row.imie != null) fieldsToSign.imie = row.imie;
    if (row.nazwisko != null) fieldsToSign.nazwisko = row.nazwisko;

    const issuedAt = Math.floor(Date.now() / 1000);
    const exp = issuedAt + 7200; // 2 godziny
    const token = await new SignJWT(fieldsToSign as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(exp)
      .sign(new TextEncoder().encode(secret));

    return { user, token };
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

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Podaj email i hasło.' },
        { status: 400 }
      );
    }

    type LoginResult = { user: { id: string | number; email: string; imie?: string; nazwisko?: string }; token: string };
    let result: LoginResult | null = null;

    try {
      result = await withTimeout(
        (async (): Promise<LoginResult> => {
          const payload = await getPayload({ config });
          const loginResult = await payload.login({
            collection: 'users',
            data: { email: email.toLowerCase(), password },
          });
          const u = loginResult.user as { id: string | number; email?: string; imie?: string; nazwisko?: string };
          const token = loginResult.token ?? '';
          return {
            user: {
              id: u.id,
              email: u.email ?? email.toLowerCase(),
              imie: u.imie,
              nazwisko: u.nazwisko,
            },
            token,
          };
        })(),
        PAYLOAD_TIMEOUT_MS,
        'timeout'
      );
    } catch (payloadErr: unknown) {
      const isTimeout = payloadErr instanceof Error && payloadErr.message === 'timeout';
      if (isTimeout) {
        const fallback = await loginViaDb(email, password);
        if (fallback) result = { user: fallback.user, token: fallback.token };
      } else {
        throw payloadErr;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Nieprawidłowy email lub hasło.' },
        { status: 401 }
      );
    }

    const cookie = `${COOKIE_NAME}=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          imie: (result.user as { imie?: string }).imie,
          nazwisko: (result.user as { nazwisko?: string }).nazwisko,
        },
      },
      { headers: { 'Set-Cookie': cookie } }
    );
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Logowanie nie powiodło się.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
