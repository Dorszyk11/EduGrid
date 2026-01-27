import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { processPdfImport } from '@/utils/import/meinPdfProcessor';

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
      // Przetwórz plik
      const result = await processPdfImport(tempPath, {
        useOCR: options.useOCR !== false, // Domyślnie włączone
        typSzkolyId: options.typSzkolyId,
        rokSzkolny: options.rokSzkolny || '2024/2025',
        autoSave: options.autoSave === true, // Domyślnie wyłączone - tylko podgląd
      });

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        warnings: result.warnings,
        preview: result.preview,
        totalRows: result.preview.length,
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
