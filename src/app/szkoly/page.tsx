'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TypSzkoly {
  id: string | number;
  nazwa: string;
  liczba_lat?: number;
  kod_mein?: string;
}

export default function ZarzadzanieSzkolamiPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchSzkoly = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSzkoly(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania');
      setSzkoly([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSzkoly();
  }, []);

  const handleResetAndSchools = async () => {
    if (
      !confirm(
        'Usunąć wszystkie dane testowe (rozkłady, siatki, kwalifikacje, klasy, zawody, mapowania, nauczycieli, przedmioty, typy szkół) i dodać tylko typy szkół z planów MEiN?'
      )
    )
      return;
    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seed/reset-and-schools', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage({
        type: 'ok',
        text: `Gotowe. Usunięto dane testowe, dodano ${data.schoolsCreated ?? 0} typów szkół z planów MEiN.`,
      });
      fetchSzkoly();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Błąd podczas resetu i ładowania szkół',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (s: TypSzkoly) => {
    if (!confirm(`Usunąć typ szkoły „${s.nazwa}”?`)) return;
    const id = String(s.id);
    setDeletingId(s.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/typy-szkol/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessage({ type: 'ok', text: 'Typ szkoły usunięty.' });
      fetchSzkoly();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Błąd podczas usuwania',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">Zarządzanie szkołami</h1>
          <p className="text-ink-soft mt-1">
            Typy szkół w bazie. Możesz je usunąć lub dodać w Panelu admina.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetAndSchools}
            disabled={resetting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warn text-white rounded hover:bg-warn font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetowanie…' : '🔄 Reset bazy i załaduj szkoły z planów MEiN'}
          </button>
          <Link
            href="/panel-admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-accent-strong font-medium"
          >
            <span>➕</span> Panel admina
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded ${
            message.type === 'ok' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink-faint">Ładowanie…</div>
      ) : error ? (
        <div className="py-8 px-4 bg-danger-bg text-danger rounded-card">{error}</div>
      ) : szkoly.length === 0 ? (
        <div className="py-12 px-4 bg-surface-2 rounded-card text-center text-ink-soft">
          Brak typów szkół. Użyj przycisku „Reset bazy i załaduj szkoły z planów MEiN” powyżej
          albo dodaj je w{' '}
          <Link href="/panel-admin" className="text-accent hover:underline">
            Panel admina
          </Link>
          .
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="px-5 py-3 text-sm font-medium text-ink-soft">Nazwa</th>
                  <th className="px-5 py-3 text-sm font-medium text-ink-soft">Kod MEiN</th>
                  <th className="px-5 py-3 text-sm font-medium text-ink-soft">Lata</th>
                  <th className="px-5 py-3 text-sm font-medium text-ink-soft text-right w-32">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {szkoly.map((s) => (
                  <tr
                    key={String(s.id)}
                    className="border-b border-line last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3 font-medium text-ink">{s.nazwa}</td>
                    <td className="px-5 py-3 text-ink-soft">{s.kod_mein ?? '–'}</td>
                    <td className="px-5 py-3 text-ink-soft">{s.liczba_lat ?? '–'}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        className="px-3 py-1.5 text-sm text-danger hover:bg-danger-bg rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === s.id ? 'Usuwanie…' : 'Usuń'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
