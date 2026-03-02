import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { assertDatabaseHostResolvable } from '@/lib/dbHost';

/** Rozgrzewa Payload (połączenie z bazą) – wywołaj przy ładowaniu strony logowania. */
export async function GET() {
  try {
    await assertDatabaseHostResolvable(process.env.DATABASE_URI);
    await getPayload({ config });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message ?? 'Błąd połączenia z bazą.')
        : 'Błąd połączenia z bazą.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
