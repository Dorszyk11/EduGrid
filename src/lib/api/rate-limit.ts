/**
 * Prosty rate-limiter w pamięci (fixed window) dla tras wrażliwych (logowanie, rejestracja).
 * Najlepszy wysiłek: w serverless licznik jest per-instancja, ale realnie podnosi koszt
 * brute-force / credential-stuffing / enumeracji. Wyłączony w testach (NODE_ENV==='test').
 * Dla twardych gwarancji wieloinstancyjnych docelowo magazyn współdzielony (Redis/Upstash).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

function purgeExpired(now: number): void {
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

/** Zwiększa licznik dla klucza i mówi, czy żądanie mieści się w limicie w bieżącym oknie. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (process.env.NODE_ENV === 'test') return { allowed: true, retryAfterSec: 0 };
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) purgeExpired(now);

  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Klucz limitu z IP klienta (x-forwarded-for/x-real-ip) + zakres + opcjonalny dyskryminator (np. email). */
export function clientKey(request: Request, scope: string, discriminator?: string): string {
  const xff = request.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}:${discriminator ?? ''}`;
}
