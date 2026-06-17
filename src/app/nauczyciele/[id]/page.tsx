'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NauczycielPage() {
  const params = useParams();
  const router = useRouter();
  const nauczycielId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuwanieId, setUsuwanieId] = useState<string | number | null>(null);

  useEffect(() => {
    if (nauczycielId) {
      pobierzDane();
    }
  }, [nauczycielId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/nauczyciele/${nauczycielId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych nauczyciela:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  const usunPrzypisanie = async (rozkładId: string | number) => {
    setUsuwanieId(rozkładId);
    setError(null);
    try {
      const res = await fetch(`/api/nauczyciele/obciazenie/${rozkładId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Błąd usuwania');
      await pobierzDane();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setUsuwanieId(null);
    }
  };

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-ink-soft">Ładowanie danych nauczyciela...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-danger-bg border border-danger rounded p-4">
          <p className="text-danger font-semibold">Błąd:</p>
          <p className="text-danger">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-danger text-white rounded hover:bg-danger"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  if (!dane) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-ok-bg text-ok';
      case 'PRZECIĄŻENIE':
        return 'bg-danger-bg text-danger';
      case 'NIEDOCIĄŻENIE':
        return 'bg-warn-bg text-warn';
      default:
        return 'bg-surface-2 text-ink';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return '✅';
      case 'PRZECIĄŻENIE':
        return '❌';
      case 'NIEDOCIĄŻENIE':
        return '⚠️';
      default:
        return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
            {dane.nauczyciel.imie} {dane.nauczyciel.nazwisko}
          </h1>
          <p className="text-ink-soft mt-1">
            {dane.nauczyciel.email} • {dane.nauczyciel.telefon}
          </p>
          <p className="text-sm text-ink-faint mt-1">
            Etat: {dane.nauczyciel.etat} • Max obciążenie: {dane.nauczyciel.max_obciazenie}h/tyg
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-line hover:bg-line-strong rounded"
        >
          ← Wróć do dashboardu
        </Link>
      </div>

      {/* Podsumowanie obciążenia */}
      <div className="bg-surface rounded shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Podsumowanie obciążenia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-2 p-4 rounded">
            <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.suma_godzin_tyg}</p>
          </div>
          <div className="bg-surface-2 p-4 rounded">
            <p className="text-sm text-ink-soft">Procent obciążenia</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.procent_obciazenia}%</p>
          </div>
          <div className={`p-4 rounded ${getStatusColor(dane.podsumowanie.status)}`}>
            <p className="text-sm font-semibold">Status</p>
            <p className="text-xl font-bold">
              {getStatusIcon(dane.podsumowanie.status)} {dane.podsumowanie.status}
            </p>
          </div>
        </div>
        {dane.podsumowanie.roznica !== 0 && (
          <div className={`mt-4 p-3 rounded ${
            dane.podsumowanie.roznica > 0 ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn'
          }`}>
            <p className="font-semibold">
              {dane.podsumowanie.roznica > 0 ? 'Przekroczono' : 'Niedociążenie'} o {Math.abs(dane.podsumowanie.roznica)} godzin tygodniowo
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-sm text-ink-soft">
            Liczba klas: <span className="font-semibold">{dane.podsumowanie.liczba_klas}</span>
          </div>
          <div className="text-sm text-ink-soft">
            Liczba przedmiotów: <span className="font-semibold">{dane.podsumowanie.liczba_przedmiotow}</span>
          </div>
        </div>
      </div>

      {/* Kwalifikacje */}
      {dane.kwalifikacje.length > 0 && (
        <div className="bg-surface rounded shadow-card p-6">
          <h2 className="text-xl font-semibold mb-4">Kwalifikacje</h2>
          <div className="space-y-2">
            {dane.kwalifikacje.map((kwal: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-surface-2 p-3 rounded">
                <div>
                  <p className="font-semibold">{kwal.przedmiot.nazwa}</p>
                  <p className="text-sm text-ink-soft">{kwal.specjalizacja} • {kwal.stopien}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Obciążenie szczegółowe */}
      <div className="bg-surface rounded shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Obciążenie szczegółowe</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                  Klasa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                  Przedmiot
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-ink-faint uppercase tracking-wider">
                  Rok
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-ink-faint uppercase tracking-wider">
                  Godz./tyg
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-ink-faint uppercase tracking-wider">
                  Rok szkolny
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-ink-faint uppercase tracking-wider w-24">
                  {' '}
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-line">
              {dane.obciazenie.map((obc: any, index: number) => (
                <tr key={index} className="hover:bg-surface-2">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/klasy/${obc.klasa.id}`}
                      className="text-accent hover:text-accent-strong font-medium"
                    >
                      {obc.klasa.nazwa}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/przedmioty/${obc.przedmiot.id}`}
                      className="text-accent hover:text-accent-strong"
                    >
                      {obc.przedmiot.nazwa}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-ink-soft">
                    {obc.rok ? obc.rok : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {obc.godziny_tyg}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {obc.rok_szkolny}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {obc.id != null ? (
                      <button
                        type="button"
                        onClick={() => usunPrzypisanie(obc.id)}
                        disabled={usuwanieId === obc.id}
                        className="text-danger hover:text-danger text-sm font-medium disabled:opacity-50"
                      >
                        {usuwanieId === obc.id ? '…' : 'Usuń'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
