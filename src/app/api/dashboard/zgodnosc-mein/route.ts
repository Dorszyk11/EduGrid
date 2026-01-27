import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczZgodnoscDlaSzkoly } from '@/utils/zgodnoscMein';

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

    const wyniki = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny);

    // Agreguj dane dla dashboardu
    const statystyki = {
      lacznie: wyniki.length,
      zgodne: wyniki.filter(w => w.status === 'OK').length,
      zBrakami: wyniki.filter(w => w.status === 'BRAK').length,
      zNadwyzkami: wyniki.filter(w => w.status === 'NADWYŻKA').length,
      sredniProcent: wyniki.length > 0
        ? wyniki.reduce((sum, w) => sum + w.roznica.procent_realizacji, 0) / wyniki.length
        : 0,
    };

    return NextResponse.json({
      wyniki,
      statystyki,
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu zgodności MEiN:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
