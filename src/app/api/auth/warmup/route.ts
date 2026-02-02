import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/** Rozgrzewa Payload (połączenie z bazą) – wywołaj przy ładowaniu strony logowania. */
export async function GET() {
  try {
    await getPayload({ config });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
