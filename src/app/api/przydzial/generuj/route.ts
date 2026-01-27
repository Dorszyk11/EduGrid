import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { automatycznyRozdzialGodzin, type ParametryRozdzialu } from '@/utils/automatycznyRozdzialGodzin';

/**
 * POST /api/przydzial/generuj - Generuje propozycję przydziału godzin
 * 
 * Body:
 * {
 *   typSzkolyId?: string;
 *   rokSzkolny: string;
 *   wymagajKwalifikacji?: boolean;
 *   maksymalnePrzekroczenie?: number;
 *   preferujKontynuacje?: boolean;
 *   minimalneObciazenie?: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      typSzkolyId,
      rokSzkolny,
      wymagajKwalifikacji = true,
      maksymalnePrzekroczenie = 0,
      preferujKontynuacje = true,
      minimalneObciazenie = 0,
    } = body;

    if (!rokSzkolny) {
      return NextResponse.json(
        { error: 'rokSzkolny jest wymagany' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const parametry: ParametryRozdzialu = {
      rokSzkolny,
      wymagajKwalifikacji,
      maksymalnePrzekroczenie,
      preferujKontynuacje,
      minimalneObciazenie,
    };

    if (typSzkolyId) {
      parametry.typSzkolyId = typSzkolyId;
    }

    const wynik = await automatycznyRozdzialGodzin(payload, parametry);

    return NextResponse.json({
      success: true,
      wynik,
    });
  } catch (error) {
    console.error('Błąd przy generowaniu przydziału:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
