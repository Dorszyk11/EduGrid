'use client';

import { useId, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';

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

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const PUSTA = '–';

const ETAP_LABEL: Record<'uploading' | 'processing', string> = {
  uploading: 'Wysyłanie pliku…',
  processing: 'Parsowanie PDF (analiza tabel / OCR)…',
};

const subjectColumns: Column<RamowyPlanSubject>[] = [
  { key: 'subject', header: 'Przedmiot', render: (s) => s.subject },
  {
    key: 'total_hours',
    header: 'Razem (godz.)',
    align: 'right',
    className: 'tabular-nums',
    render: (s) => (s.total_hours != null ? s.total_hours : PUSTA),
  },
  {
    key: 'total_hours_raw',
    header: 'Razem (raw)',
    className: 'font-mono text-xs text-ink-faint',
    render: (s) => s.total_hours_raw || PUSTA,
  },
];

export default function ImportMeinPdf() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<ImportResult | null>(null);
  const [useOCR, setUseOCR] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const fileInputId = useId();
  const ocrId = useId();
  const busy = status === 'uploading' || status === 'processing';

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('options', JSON.stringify({ useOCR }));

    setStatus('uploading');
    setResults(null);

    try {
      // Po rozwiązaniu się fetch nagłówki są odebrane (wysyłka zakończona);
      // ciężka praca serwera (parsowanie / OCR) trwa do odczytania ciała.
      const response = await fetch('/api/import/mein-pdf', { method: 'POST', body: formData });
      setStatus('processing');
      const text = await response.text();

      const ct = response.headers.get('content-type') ?? '';
      if (text.trimStart().startsWith('<') || !ct.includes('application/json')) {
        const msg = !response.ok
          ? `Błąd ${response.status}: serwer zwrócił HTML zamiast JSON. Sprawdź konsolę i logi API.`
          : 'Odpowiedź nie jest JSON (np. strona błędu). Sprawdź konsolę.';
        setStatus('error');
        setResults({ success: false, plans: [], errors: [msg], warnings: [] });
        toast.error('Import nie powiódł się.');
        return;
      }

      let data: ImportResult & { error?: string };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        setStatus('error');
        setResults({ success: false, plans: [], errors: ['Nieprawidłowa odpowiedź JSON z API.'], warnings: [] });
        toast.error('Import nie powiódł się.');
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Błąd importu');

      const plans = data.plans ?? [];
      setResults({
        success: data.success ?? false,
        plans,
        errors: data.errors ?? [],
        warnings: data.warnings ?? [],
      });
      setStatus('success');
      setExpandedPlanId(plans[0]?.plan_id ?? null);
      toast.success(`Zaimportowano ${plans.length} ${plans.length === 1 ? 'plan' : 'plany/planów'}.`);
    } catch (e) {
      setStatus('error');
      setResults({
        success: false,
        plans: [],
        errors: [e instanceof Error ? e.message : 'Nieznany błąd'],
        warnings: [],
      });
      toast.error('Import nie powiódł się.');
      console.error(e);
    }
  };

  const pobierzJson = () => {
    if (!results?.plans.length) return;
    const blob = new Blob([JSON.stringify({ plans: results.plans }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ramowe-plany.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const liczbaPrzedmiotow = results?.plans.reduce((a, p) => a + p.subjects.length, 0) ?? 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Import ramowych planów nauczania z PDF
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Wgraj rozporządzenie Dz.U. (np. wymagania nauczania) z załącznikami. Parser wyciąga{' '}
          <strong>tylko kolumnę „Razem w … okresie nauczania”</strong> dla każdego przedmiotu — bez
          sumowania, bez interpretacji przypisów.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">1. Wybierz plik PDF</h2>
        <Field label="Plik PDF" htmlFor={fileInputId} hint="Rozporządzenie Dz.U. z załącznikami (maks. 10 MB).">
          <Input
            id={fileInputId}
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            className="file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:text-ink-soft"
          />
        </Field>
        {file && (
          <p className="mt-2 text-sm text-ink-soft">
            <Icon name="file" size={14} className="mr-1 inline align-text-bottom" />
            {file.name} <span className="tabular-nums">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id={ocrId}
            checked={useOCR}
            onChange={(e) => setUseOCR(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 rounded-sm border-line-strong text-accent focus-visible:ring-2 focus-visible:ring-accent"
          />
          <label htmlFor={ocrId} className="text-sm text-ink-soft">
            Użyj OCR (dla skanów)
          </label>
        </div>

        <div className="mt-5">
          <Button type="button" onClick={handleUpload} disabled={!file || busy} className="w-full">
            {busy ? 'Przetwarzanie…' : 'Importuj i parsuj'}
          </Button>
        </div>
      </Card>

      {busy && (
        <Card>
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <span
              className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
              aria-hidden
            />
            <p className="text-sm text-ink-soft">{ETAP_LABEL[status as 'uploading' | 'processing']}</p>
          </div>
        </Card>
      )}

      {results && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">2. Wyniki</h2>

          <div aria-live="polite" className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Plany:{' '}
              <span className="text-lg font-bold tabular-nums text-ink">{results.plans.length}</span>
              <span className="ml-2 text-ink-faint">
                (<span className="tabular-nums">{liczbaPrzedmiotow}</span> przedmiotów łącznie)
              </span>
            </p>

            {results.errors.length > 0 && (
              <div role="alert" className="rounded-card border border-danger bg-danger-bg p-4">
                <p className="mb-2 flex items-center gap-2 font-semibold text-danger">
                  <Icon name="warning" size={16} /> Błędy
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-danger">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.warnings.length > 0 && (
              <div role="status" className="rounded-card border border-warn bg-warn-bg p-4">
                <p className="mb-2 flex items-center gap-2 font-semibold text-warn">
                  <Icon name="warning" size={16} /> Ostrzeżenia
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-warn">
                  {results.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.plans.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-ink">Plany (Razem w cyklu)</h3>
                {results.plans.map((plan) => {
                  const isExpanded = expandedPlanId === plan.plan_id;
                  const panelId = `plan-panel-${plan.plan_id}`;
                  return (
                    <div key={plan.plan_id} className="overflow-hidden rounded-card border border-line">
                      <button
                        type="button"
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.plan_id)}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="flex w-full items-center justify-between gap-2 bg-surface-2 px-4 py-3 text-left hover:bg-surface"
                      >
                        <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                          <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={16} className="shrink-0 text-ink-faint" />
                          <span className="truncate">
                            Załącznik nr {plan.attachment_no} · {plan.school_type} · {plan.cycle}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-ink-faint">
                          <span className="tabular-nums">{plan.subjects.length}</span> przedmiotów · str.{' '}
                          <span className="tabular-nums">{plan.source_pages.join(', ')}</span>
                        </span>
                      </button>
                      {isExpanded && (
                        <div id={panelId} className="p-3">
                          <DataTable
                            columns={subjectColumns}
                            rows={plan.subjects}
                            getRowKey={(_s, i) => i}
                            empty="Brak przedmiotów w tym załączniku."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {results.plans.length === 0 && results.errors.length === 0 && (
              <p className="text-sm text-ink-faint">
                Nie znaleziono planów. Sprawdź, czy PDF zawiera tabele „RAMOWY PLAN NAUCZANIA DLA…”.
              </p>
            )}

            {results.plans.length > 0 && (
              <div className="border-t border-line pt-4">
                <Button type="button" onClick={pobierzJson}>
                  <Icon name="download" size={16} /> Pobierz JSON (plans)
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
