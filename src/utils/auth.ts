import crypto from 'crypto';
import { jwtVerify } from 'jose';
import { type NextRequest } from 'next/server';

const COOKIE_NAME = 'payload-token';

function getTokenFromCookie(headers: Headers): string | null {
  const cookie = headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/** Tak samo jak Payload: sha256(secret).digest('hex').slice(0, 32) – używane do weryfikacji i do podpisu w fallbacku logowania. */
export function getPayloadSecretKey(): string | null {
  const raw = process.env.PAYLOAD_SECRET;
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Zwraca ID zalogowanego użytkownika na podstawie ciasteczka payload-token.
 * Używa tej samej pochodnej secretu co Payload (sha256, pierwsze 32 znaki hex).
 */
export async function getCurrentUserId(
  request: NextRequest | Request
): Promise<string | null> {
  const token = getTokenFromCookie(request.headers);
  if (!token) return null;
  const secret = getPayloadSecretKey();
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
