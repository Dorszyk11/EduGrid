'use client';

import { useState } from 'react';

interface RamowyPlanSubject {
  subject: string;
  total_hours: number | null;
  total_hours_raw: string;
}

interface RamowyPlan {
  plan_id: string;
  attachment_no: string;
  school_type: string;
  cycle: string;
  source_pages: number[];
  subjects: RamowyPlanSubject[];
}

interface ImportResult {
  success: boolean;
  plans: RamowyPlan[];
  errors: string[];
  warnings: string[];
}

export default function ImportMeinPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<ImportResult | null>(null);
  const [options, setOptions] = useState({ useOCR: false });
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('options', JSON.stringify(options));

    setStatus('uploading');
    setProgress(0);

    try {
      const response = await fetch('/api/import/mein-pdf', { method: 'POST', body: formData });
      const text = await response.text();

      let data: ImportResult & { error?: string } = {
        success: false,
        plans: [],
        errors: [],
        warnings: [],
      };

      const ct = response.headers.get('content-type') ?? '';
      if (text.trimStart().startsWith('<') || !ct.includes('application/json')) {
        const msg = !response.ok
          ? `Błąd ${response.status}: serwer zwrócił HTML zamiast JSON. Sprawdź konsolę i logi API.`
          : 'Odpowiedź nie jest JSON (np. strona błędu). Sprawdź konsolę.';
        setStatus('error');
        setResults({ ...data, errors: [msg] });
        return;
      }

      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        setStatus('error');
        setResults({ ...data, errors: ['Nieprawidłowa odpowiedź JSON z API.'] });
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Błąd importu');

      setResults({
        success: data.success ?? false,
        plans: data.plans ?? [],
        errors: data.errors ?? [],
        warnings: data.warnings ?? [],
      });
      setStatus('success');
      setProgress(100);
      if (data.plans?.length) setExpandedPlanId(data.plans[0]?.plan_id ?? null);
    } catch (e) {
      setStatus('error');
      setResults({
        success: false,
        plans: [],
        errors: [e instanceof Error ? e.message : 'Nieznany błąd'],
        warnings: [],
      });
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Import ramowych planów nauczania z PDF</h1>
      <p className="text-gray-600 mb-6">
        Wgraj rozporządzenie Dz.U. (np. wymagania nauczania) z załącznikami. Parser wyciąga
        <strong> tylko kolumnę „Razem w … okresie nauczania”</strong> dla każdego przedmiotu — bez
        sumowania, bez interpretacji przypisów.
      </p>

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
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="useOCR"
            checked={options.useOCR}
            onChange={(e) => setOptions({ ...options, useOCR: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="useOCR" className="text-sm">Użyj OCR (dla skanów)</label>
        </div>
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'processing'}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {status === 'uploading' ? 'Przetwarzanie…' : 'Importuj i parsuj'}
        </button>
      </div>

      {status === 'uploading' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-600">Parsowanie PDF…</p>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. Wyniki</h2>
          <div className="mb-4">
            <span className="font-medium text-gray-700">Plany: </span>
            <span className="text-lg font-bold text-green-700">{results.plans.length}</span>
            <span className="text-gray-500 ml-2">
              ({results.plans.reduce((a, p) => a + p.subjects.length, 0)} przedmiotów łącznie)
            </span>
          </div>

          {results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="font-semibold text-red-800 mb-2">Błędy:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {results.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {results.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="font-semibold text-yellow-800 mb-2">Ostrzeżenia:</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {results.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {results.plans.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Plany (Razem w cyklu)</h3>
              {results.plans.map((plan) => {
                const isExpanded = expandedPlanId === plan.plan_id;
                return (
                  <div key={plan.plan_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.plan_id)}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    >
                      <span className="font-medium">
                        Załącznik nr {plan.attachment_no} · {plan.school_type} · {plan.cycle}
                      </span>
                      <span className="text-sm text-gray-500">
                        {plan.subjects.length} przedmiotów · str. {plan.source_pages.join(', ')}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-3 py-2 text-left">Przedmiot</th>
                              <th className="border border-gray-300 px-3 py-2 text-right">Razem (godz.)</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Razem (raw)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.subjects.map((s, i) => (
                              <tr key={i}>
                                <td className="border border-gray-300 px-3 py-2">{s.subject}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  {s.total_hours != null ? s.total_hours : '–'}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-gray-500 font-mono text-xs">
                                  {s.total_hours_raw || '–'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.plans.length === 0 && !results.errors.length && (
            <p className="text-gray-500">
              Nie znaleziono planów. Sprawdź, czy PDF zawiera tabele „RAMOWY PLAN NAUCZANIA DLA…”.
            </p>
          )}

          {results.plans.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ plans: results.plans }, null, 2)], {
                    type: 'application/json',
                  });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'ramowe-plany.json';
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Pobierz JSON (plans)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
