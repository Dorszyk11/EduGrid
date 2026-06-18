import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczZgodnoscDlaSzkoly, agregujStatystykiZgodnosci } from '@/utils/zgodnoscMein';
import { requireUserId } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

    if (!typSzkolyId) {
      throw new ValidationError('typSzkolyId jest wymagany', 'typSzkolyId');
    }

    const payload = await getPayload({ config });

    const wyniki = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny, userId);

    // Agreguj dane dla dashboardu + sygnalizuj kompletność (rozróżnienie realne 0 vs brak danych)
    const { statystyki, kompletne, komunikat } = agregujStatystykiZgodnosci(wyniki);

    return NextResponse.json({
      wyniki,
      statystyki,
      kompletne,
      komunikat,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
