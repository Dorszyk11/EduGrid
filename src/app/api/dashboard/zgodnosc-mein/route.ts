import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczZgodnoscDlaSzkoly } from '@/utils/zgodnoscMein';
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
    return errorResponse(error);
  }
}
