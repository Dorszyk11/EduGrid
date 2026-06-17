import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUserId } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { DomainError } from '@/lib/errors';

/**
 * DELETE /api/typy-szkol/[id] - Usuwa typ szkoły z bazy.
 * Może się nie udać, jeśli istnieją powiązane klasy, siatki MEiN, zawody lub mapowania.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserId(request);
    const { id } = await params;
    const payload = await getPayload({ config });

    await payload.delete({
      collection: 'typy-szkol',
      id: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DomainError) return errorResponse(error);
    const msg = error instanceof Error ? error.message : String(error);
    const isFk =
      /foreign key|violates foreign key|violates not-null|referential integrity/i.test(msg);
    const isNotFound = /not found|record to delete not found|Unknown id/i.test(msg);

    console.error('Błąd przy usuwaniu typu szkoły:', msg);

    if (isNotFound) {
      return NextResponse.json(
        { error: 'Typ szkoły nie znaleziony.' },
        { status: 404 }
      );
    }
    if (isFk) {
      return NextResponse.json(
        {
          error:
            'Nie można usunąć: istnieją powiązane dane (klasy, siatki MEiN, zawody lub mapowania). Usuń je najpierw.',
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: msg || 'Błąd podczas usuwania.' },
      { status: 500 }
    );
  }
}
