'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

export default function RaportyPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>('2024/2025');

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  const pobierzTypySzkol = async () => {
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })));
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    }
  };

  const generujLinkRaportu = (typ: string) => {
    if (!typSzkolyId) return '#';
    return `/raporty/${typ}?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Raporty</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Powrót do dashboardu
        </button>
      </div>

      {/* Formularz wyboru */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Parametry raportu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ szkoły *
            </label>
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rok szkolny
            </label>
            <input
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="2024/2025"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Lista raportów */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Raport zgodności MEiN */}
        <Link
          href={generujLinkRaportu('zgodnosc-mein')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
            !typSzkolyId ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold mb-2">Raport zgodności MEiN</h3>
          <p className="text-sm text-gray-600">
            Szczegółowy raport zgodności planowanych godzin z wymaganiami MEiN dla każdej klasy i przedmiotu.
          </p>
        </Link>

        {/* Raport obciążeń nauczycieli */}
        <Link
          href={generujLinkRaportu('obciazenia')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
            !typSzkolyId ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold mb-2">Raport obciążeń nauczycieli</h3>
          <p className="text-sm text-gray-600">
            Analiza obciążeń godzinowych nauczycieli, wykrywanie przeciążeń i niedociążeń.
          </p>
        </Link>

        {/* Raport braków kadrowych */}
        <Link
          href={generujLinkRaportu('braki-kadrowe')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
            !typSzkolyId ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Raport braków kadrowych</h3>
          <p className="text-sm text-gray-600">
            Lista przedmiotów i klas bez przypisanych nauczycieli z sugerowanymi rozwiązaniami.
          </p>
        </Link>

        {/* Raport arkusz organizacyjny */}
        <Link
          href={generujLinkRaportu('arkusz-organizacyjny')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
            !typSzkolyId ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-semibold mb-2">Arkusz organizacyjny</h3>
          <p className="text-sm text-gray-600">
            Pełny arkusz organizacyjny szkoły z możliwością eksportu do XLS.
          </p>
        </Link>
      </div>
    </div>
  );
}
