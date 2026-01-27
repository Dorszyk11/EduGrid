import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { automatycznyRozdzialGodzin } from '@/utils/automatycznyRozdzialGodzin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

    const payload = await getPayload({ config });

    if (!typSzkolyId) {
      return NextResponse.json(
        { error: 'typSzkolyId jest wymagany' },
        { status: 400 }
      );
    }

    // Użyj algorytmu automatycznego rozdziału, aby wykryć braki
    const wynik = await automatycznyRozdzialGodzin(payload, {
      typSzkolyId,
      rokSzkolny,
    });

    // Grupuj braki według przedmiotu
    const brakiWedlugPrzedmiotu = new Map<string, typeof wynik.brakiKadrowe>();

    wynik.brakiKadrowe.forEach(brak => {
      if (!brakiWedlugPrzedmiotu.has(brak.przedmiotId)) {
        brakiWedlugPrzedmiotu.set(brak.przedmiotId, []);
      }
      brakiWedlugPrzedmiotu.get(brak.przedmiotId)!.push(brak);
    });

    const statystyki = {
      lacznie: wynik.brakiKadrowe.length,
      wedlugPrzedmiotu: Array.from(brakiWedlugPrzedmiotu.entries()).map(([przedmiotId, braki]) => ({
        przedmiotId,
        przedmiotNazwa: braki[0].przedmiotNazwa,
        liczbaKlas: braki.length,
        laczneGodziny: braki.reduce((sum, b) => sum + b.godzinyTygodniowo, 0),
        powod: braki[0].powod,
        dostepniNauczyciele: braki[0].dostepniNauczyciele,
      })),
      laczneGodziny: wynik.brakiKadrowe.reduce((sum, b) => sum + b.godzinyTygodniowo, 0),
      wymaganeEtaty: Math.ceil(
        wynik.brakiKadrowe.reduce((sum, b) => sum + b.godzinyTygodniowo, 0) / 18
      ),
    };

    return NextResponse.json({
      braki: wynik.brakiKadrowe.map(b => ({
        ...b,
        przedmiotId: b.przedmiotId,
        klasaId: b.klasaId,
      })),
      statystyki: {
        ...statystyki,
        wedlugPrzedmiotu: statystyki.wedlugPrzedmiotu.map(p => ({
          ...p,
          przedmiotId: p.przedmiotId,
        })),
      },
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu braków kadrowych:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
