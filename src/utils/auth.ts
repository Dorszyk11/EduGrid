import crypto from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { type NextRequest } from 'next/server';

/**
 * Jak instancja Payload (`dist/index.js`): sekret do JWT to UTF-8(ciag hex),
 * gdzie ciąg = sha256(PAYLOAD_SECRET).digest('hex').slice(0, 32).
 * Samo PAYLOAD_SECRET NIE jest używane bezpośrednio do HS256.
 */
export const AUTH_COOKIE_NAME = 'payload-token';

/** Bez „Zapamiętaj mnie”: sesja przeglądarki + JWT na wypadek długiej pracy w jednej sesji. */
export const AUTH_SESSION_JWT_MAX_AGE_SEC = 60 * 60 * 24; // 24 h

/** Z „Zapamiętaj mnie”: JWT i Max-Age ciasteczka – przetrwa zamknięcie przeglądarki. */
export const AUTH_REMEMBER_JWT_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 dni

/** W JWT: true = „Zapamiętaj mnie”; false = sesja tylko w kontekście karty (sessionStorage + BroadcastChannel). */
export const AUTH_JWT_REMEMBER_CLAIM = 'rm' as const;

const JWT_RESERVED_CLAIMS = new Set(['exp', 'iat', 'nbf', 'jti', 'iss', 'aud', 'sub']);

function getTokenFromCookie(headers: Headers): string | null {
  const cookie = headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/** Ten sam string co `payload.secret` po inicjalizacji Payload (32 znaki hex). */
export function getPayloadJwtSigningSecretString(): string | null {
  const raw = process.env.PAYLOAD_SECRET;
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Wystawia nowy JWT z tymi samymi polami co token z Payload, z własnym czasem wygaśnięcia.
 * Domyślny token z `payload.login()` wygasa po 2 h — bez tego odświeżenie strony po 2 h „wylogowuje”.
 */
export async function reissueAuthJwt(
  existingToken: string,
  maxAgeSeconds: number,
  options: { rememberMe: boolean }
): Promise<string> {
  const secret = getPayloadJwtSigningSecretString();
  if (!secret) throw new Error('Brak PAYLOAD_SECRET.');
  const key = new TextEncoder().encode(secret);
  const { payload: decoded } = await jwtVerify(existingToken, key);
  const claims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(decoded)) {
    if (!JWT_RESERVED_CLAIMS.has(k)) claims[k] = v;
  }
  claims[AUTH_JWT_REMEMBER_CLAIM] = options.rememberMe;
  const issuedAt = Math.floor(Date.now() / 1000);
  const exp = issuedAt + maxAgeSeconds;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(exp)
    .sign(key);
}

/** Zwraca ID zalogowanego użytkownika z ciasteczka `payload-token` (ten sam sekret co Payload JWT). */
export async function getCurrentUserId(
  request: NextRequest | Request
): Promise<string | null> {
  const token = getTokenFromCookie(request.headers);
  if (!token) return null;
  const secret = getPayloadJwtSigningSecretString();
  if (!secret) return null;
  try {
    const { payload: decoded } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const userId = decoded.id;
    if (userId == null) return null;
    return String(userId);
  } catch {
    return null;
  }
}
