'use client';

import { useState, useEffect } from 'react';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
  preview: any[];
  totalRows: number;
}

export default function ImportMeinPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<ImportResult | null>(null);
  const [options, setOptions] = useState({
    useOCR: true,
    typSzkolyId: '',
    rokSzkolny: '2024/2025',
    autoSave: false,
  });
  const [typySzkol, setTypySzkol] = useState<Array<{ id: string; nazwa: string }>>([]);

  // Pobierz typy szkół przy montowaniu komponentu
  useEffect(() => {
    fetch('/api/typy-szkol')
      .then(res => res.json())
      .then(data => {
        const mapped = Array.isArray(data) 
          ? data.map((item: any) => ({
              id: String(item.id || ''),
              nazwa: item.nazwa || 'Brak nazwy',
            }))
          : [];
        setTypySzkol(mapped);
      })
      .catch(err => console.error('Błąd przy pobieraniu typów szkół:', err));
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('options', JSON.stringify(options));

    setStatus('uploading');
    setProgress(0);
    
    try {
      const response = await fetch('/api/import/mein-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setStatus('success');
        setProgress(100);
      } else {
        throw new Error(data.error || 'Błąd importu');
      }
    } catch (error) {
      setStatus('error');
      setResults({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Nieznany błąd'],
        warnings: [],
        preview: [],
        totalRows: 0,
      });
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!results || !file) return;

    setStatus('processing');
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('options', JSON.stringify({
        ...options,
        autoSave: true,
      }));

      const response = await fetch('/api/import/mein-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setStatus('success');
        alert(`Pomyślnie zaimportowano ${data.imported} rekordów!`);
      } else {
        throw new Error(data.error || 'Błąd zapisu');
      }
    } catch (error) {
      setStatus('error');
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Import siatki godzin MEiN z PDF</h1>
      
      {/* Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Wybierz plik PDF</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4"
            disabled={status === 'uploading' || status === 'processing'}
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              Wybrany plik: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Opcje */}
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Typ szkoły (opcjonalnie)</label>
            <select
              value={options.typSzkolyId}
              onChange={(e) => setOptions({ ...options, typSzkolyId: e.target.value })}
              className="w-full border rounded px-4 py-2"
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rok szkolny</label>
            <input
              type="text"
              value={options.rokSzkolny}
              onChange={(e) => setOptions({ ...options, rokSzkolny: e.target.value })}
              className="w-full border rounded px-4 py-2"
              placeholder="2024/2025"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="useOCR"
              checked={options.useOCR}
              onChange={(e) => setOptions({ ...options, useOCR: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="useOCR" className="text-sm">
              Użyj OCR (dla skanów PDF)
            </label>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'processing'}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {status === 'uploading' ? 'Przetwarzanie...' : 'Importuj i sprawdź'}
        </button>
      </div>

      {/* Progress */}
      {status === 'uploading' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">Przetwarzanie pliku PDF...</p>
        </div>
      )}

      {/* Wyniki */}
      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. Wyniki importu</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm text-green-700 font-medium">Znaleziono rekordów</p>
              <p className="text-2xl font-bold text-green-900">{results.totalRows}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-700 font-medium">Zaimportowano</p>
              <p className="text-2xl font-bold text-blue-900">{results.imported}</p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="font-semibold text-red-800 mb-2">Błędy ({results.errors.length}):</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {results.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {results.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="font-semibold text-yellow-800 mb-2">Ostrzeżenia ({results.warnings.length}):</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {results.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {results.preview.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Podgląd danych:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Przedmiot</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Typ szkoły</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Klasa</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Godz. w cyklu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.preview.slice(0, 10).map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-4 py-2">{row.przedmiotId}</td>
                        <td className="border border-gray-300 px-4 py-2">{row.typSzkolyId}</td>
                        <td className="border border-gray-300 px-4 py-2">{row.klasa || '-'}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{row.godziny_w_cyklu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.preview.length > 10 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Pokazano 10 z {results.preview.length} rekordów
                  </p>
                )}
              </div>
            </div>
          )}

          {results.success && results.imported === 0 && (
            <button
              onClick={handleSave}
              disabled={status === 'processing'}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {status === 'processing' ? 'Zapisywanie...' : 'Zapisz do bazy danych'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
