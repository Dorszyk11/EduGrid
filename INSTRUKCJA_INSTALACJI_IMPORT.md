# Instrukcja instalacji modułu importu PDF

## 1. Zainstaluj zależności

```bash
npm install pdf-parse tesseract.js zod
npm install --save-dev @types/pdf-parse
```

Jeśli pojawią się błędy z peer dependencies:

```bash
npm install pdf-parse tesseract.js zod --legacy-peer-deps
```

## 2. Sprawdź strukturę plików

Upewnij się, że utworzone zostały następujące pliki:

```
src/
├── utils/
│   └── import/
│       ├── types.ts
│       ├── pdfExtractor.ts
│       ├── tableParser.ts
│       ├── dataMapper.ts
│       ├── validator.ts
│       └── meinPdfProcessor.ts
├── app/
│   ├── api/
│   │   └── import/
│   │       └── mein-pdf/
│   │           └── route.ts
│   └── import/
│       └── mein-pdf/
│           └── page.tsx
└── components/
    └── import/
        └── ImportMeinPdf.tsx
```

## 3. Dostęp do funkcji importu

### Przez interfejs webowy:
- Otwórz: http://localhost:3000/import/mein-pdf
- Wgraj plik PDF
- Wybierz opcje importu
- Kliknij "Importuj i sprawdź"
- Przejrzyj podgląd danych
- Kliknij "Zapisz do bazy danych" jeśli wszystko jest OK

### Przez API:
```bash
curl -X POST http://localhost:3000/api/import/mein-pdf \
  -F "pdf=@siatka-mein.pdf" \
  -F 'options={"useOCR":true,"typSzkolyId":"...","autoSave":false}'
```

## 4. Uwagi

### OCR (Tesseract.js)
- OCR wymaga konwersji PDF do obrazów
- Dla pełnej funkcjonalności OCR, rozważ użycie:
  - `pdf-poppler` (wymaga instalacji poppler)
  - `pdf2pic`
  - Zewnętrzne API OCR (np. Google Cloud Vision, AWS Textract)

### Format PDF
- System najlepiej działa z PDF zawierającymi tekst (nie skany)
- Dla skanów wymagany jest OCR
- Tabela powinna mieć czytelny format z nagłówkami

### Mapowanie danych
- System automatycznie wyszukuje przedmioty i typy szkół w bazie
- Jeśli przedmiot nie zostanie znaleziony, zostanie pominięty (z ostrzeżeniem)
- Upewnij się, że masz dodane przedmioty i typy szkół w bazie przed importem

## 5. Rozwiązywanie problemów

### Błąd: "pdf-parse nie jest zainstalowany"
```bash
npm install pdf-parse
```

### Błąd: "OCR nie jest dostępne"
```bash
npm install tesseract.js
```

### Błąd: "Nie znaleziono tabeli"
- Sprawdź format PDF
- Upewnij się, że PDF zawiera tabelę z siatką godzin
- Spróbuj użyć OCR (dla skanów)

### Błąd: "Nie znaleziono przedmiotu"
- Dodaj przedmioty do bazy danych przez panel admin
- Sprawdź, czy nazwy przedmiotów w PDF pasują do nazw w bazie

---

**Gotowe!** Moduł importu jest gotowy do użycia. 🚀
