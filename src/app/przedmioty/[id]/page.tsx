'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrzedmiotPage() {
  const params = useParams();
  const router = useRouter();
  const przedmiotId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (przedmiotId) {
      pobierzDane();
    }
  }, [przedmiotId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/przedmioty/${przedmiotId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych przedmiotu:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-ink-soft">Ładowanie danych przedmiotu...</p>
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

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">{dane.przedmiot.nazwa}</h1>
          <p className="text-ink-soft mt-1">
            {dane.przedmiot.typ_zajec} • {dane.przedmiot.poziom}
            {dane.przedmiot.kod_mein && ` • Kod MEiN: ${dane.przedmiot.kod_mein}`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-line hover:bg-line-strong rounded"
        >
          ← Wróć do dashboardu
        </Link>
      </div>

      {/* Podsumowanie */}
      <div className="bg-surface rounded shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Podsumowanie</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-2 p-4 rounded">
            <p className="text-sm text-ink-soft">Łączna liczba godzin</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.laczna_godziny}</p>
          </div>
          <div className="bg-surface-2 p-4 rounded">
            <p className="text-sm text-ink-soft">Liczba klas</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.liczba_klas}</p>
          </div>
          <div className="bg-surface-2 p-4 rounded">
            <p className="text-sm text-ink-soft">Liczba nauczycieli</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.liczba_nauczycieli}</p>
          </div>
        </div>
      </div>

      {/* Podział na klasy */}
      <div className="bg-surface rounded shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Podział na klasy</h2>
        <div className="space-y-4">
          {dane.klasy.map((klasaItem: any, index: number) => (
            <div key={index} className="border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link
                    href={`/klasy/${klasaItem.klasa.id}`}
                    className="text-lg font-semibold text-accent hover:text-accent-strong"
                  >
                    {klasaItem.klasa.nazwa}
                  </Link>
                  {klasaItem.klasa.profil && (
                    <p className="text-sm text-ink-soft">Profil: {klasaItem.klasa.profil}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
                  <p className="text-xl font-bold">{klasaItem.godziny_tyg}</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-semibold mb-2">Nauczyciele:</p>
                {klasaItem.nauczyciele.length > 0 ? (
                  <div className="space-y-2">
                    {klasaItem.nauczyciele.map((nauczyciel: any, nIndex: number) => (
                      <div key={nIndex} className="flex items-center justify-between bg-surface-2 p-2 rounded">
                        <Link
                          href={`/nauczyciele/${nauczyciel.id}`}
                          className="text-accent hover:text-accent-strong"
                        >
                          {nauczyciel.imie} {nauczyciel.nazwisko}
                        </Link>
                        <div className="text-sm text-ink-soft">
                          {nauczyciel.godziny_tyg}h/tyg • {nauczyciel.godziny_roczne}h/rok
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-faint text-sm">Brak przypisanych nauczycieli</p>
                )}
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm text-ink-soft">
                    Razem: <span className="font-semibold">{klasaItem.godziny_roczne} godzin rocznie</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
