import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import {
  automatycznyRozdzialGodzin,
  getDiagnostykaPrzydzialu,
  type ParametryRozdzialu,
} from '@/utils/automatycznyRozdzialGodzin';

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
      rokSzkolny: String(rokSzkolny).trim(),
      wymagajKwalifikacji,
      maksymalnePrzekroczenie,
      preferujKontynuacje,
      minimalneObciazenie,
    };

    if (typSzkolyId != null && typSzkolyId !== '') {
      parametry.typSzkolyId = String(typSzkolyId);
    }

    const wynik = await automatycznyRozdzialGodzin(payload, parametry);

    let diagnostyka = null;
    if (wynik.metryki.lacznieZadan === 0) {
      try {
        diagnostyka = await getDiagnostykaPrzydzialu(payload, parametry);
      } catch (e) {
        console.error('Diagnostyka przydziału:', e);
      }
    }

    return NextResponse.json({
      success: true,
      wynik,
      diagnostyka,
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
