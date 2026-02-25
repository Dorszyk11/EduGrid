'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly } from '@/utils/typSzkolyStorage';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface Klasa {
  id: string;
  nazwa: string;
  rok_szkolny: string;
  profil: string | null;
  typ_szkoly: { id: string; nazwa?: string } | null;
}

export default function KlasyPage() {
  const [klasy, setKlasy] = useState<Klasa[]>([]);
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/typy-szkol', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) return;
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        const mapped = list.map((t: any) => ({ id: String(t.id), nazwa: t.nazwa || 'Brak nazwy' }));
        setTypySzkol(mapped);
        const zap = getZapamietanyTypSzkoly();
        if (zap && mapped.some((t: { id: string }) => t.id === zap)) setTypSzkolyId(zap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    pobierzKlasy();
  }, [typSzkolyId]);

  const pobierzKlasy = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typSzkolyId) params.set('typSzkolyId', typSzkolyId);
      const res = await fetch(`/api/klasy?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setKlasy(data.klasy ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania');
      setKlasy([]);
    } finally {
      setLadowanie(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Klasy</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Filtry */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Filtruj po typie szkoły</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ szkoły</label>
          <select
            value={typSzkolyId}
            onChange={(e) => {
              const v = e.target.value;
              zapiszTypSzkoly(v);
              setTypSzkolyId(v);
            }}
            className="w-full max-w-md border rounded px-3 py-2"
          >
            <option value="">Wszystkie typy</option>
            {typySzkol.map((t) => (
              <option key={t.id} value={t.id}>{t.nazwa}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Lista klas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Lista klas ({klasy.length})</h2>
        </div>

        {ladowanie ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2">Ładowanie...</p>
          </div>
        ) : klasy.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="mb-2">Brak klas dla wybranego typu szkoły.</p>
            <p className="text-sm text-gray-500">
              Dodaj klasy w{' '}
              <Link href="/panel-admin" className="text-blue-600 hover:underline">
                panelu admina
              </Link>
              {' '}(sekcja „Dodawanie klas”) lub wybierz inny typ szkoły powyżej.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lp.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nazwa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ szkoły</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rok szkolny (zakres cyklu)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profil</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {klasy.map((k, index) => (
                  <tr key={k.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/klasy/${k.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {k.nazwa}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {k.typ_szkoly?.nazwa ?? '–'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{k.rok_szkolny}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{k.profil ?? '–'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/klasy/${k.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
