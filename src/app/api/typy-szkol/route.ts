import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET() {
  try {
    const payload = await getPayload({ config });

    const typySzkol = await payload.find({
      collection: 'typy-szkol',
      limit: 100,
    });

    console.log('Znaleziono typów szkół:', typySzkol.docs.length);
    console.log('Przykładowy typ szkoły:', typySzkol.docs[0]);

    // Zwróć dane w spójnym formacie
    const mapped = typySzkol.docs.map((item: any) => ({
      id: item.id,
      nazwa: item.nazwa || 'Brak nazwy',
      liczba_lat: item.liczba_lat,
      kod_mein: item.kod_mein,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Błąd przy pobieraniu typów szkół:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
    return NextResponse.json(
      { 
        error: 'Błąd serwera',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
