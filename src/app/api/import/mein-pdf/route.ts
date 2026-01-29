import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { processRamowyPlanImport } from '@/utils/import/meinPdfProcessor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const optionsJson = formData.get('options') as string;
    const options = optionsJson ? JSON.parse(optionsJson) : {};

    if (!file) {
      return NextResponse.json(
        { error: 'Brak pliku PDF', success: false },
        { status: 400 }
      );
    }

    // Sprawdź typ pliku
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Plik musi być w formacie PDF', success: false },
        { status: 400 }
      );
    }

    // Sprawdź rozmiar (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar: 10MB', success: false },
        { status: 400 }
      );
    }

    // Zapisz plik tymczasowo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Utwórz katalog temp jeśli nie istnieje
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    const tempPath = join(tempDir, `import-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    
    await writeFile(tempPath, buffer);

    try {
      const result = await processRamowyPlanImport(tempPath, {
        useOCR: options.useOCR !== false,
      });

      return NextResponse.json({
        success: result.errors.length === 0,
        plans: result.plans,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      console.error('Błąd przetwarzania PDF:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Błąd przetwarzania pliku PDF',
          success: false,
        },
        { status: 500 }
      );
    } finally {
      // Usuń plik tymczasowy
      try {
        await unlink(tempPath);
      } catch (err) {
        console.warn('Nie udało się usunąć pliku tymczasowego:', err);
      }
    }
  } catch (error) {
    console.error('Błąd importu PDF:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        success: false,
      },
      { status: 500 }
    );
  }
}
