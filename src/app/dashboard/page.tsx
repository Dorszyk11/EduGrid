'use client';

import { useEffect, useState } from 'react';
import DashboardKarty from '@/components/dashboard/DashboardKarty';
import ZgodnoscMeinWykres from '@/components/dashboard/ZgodnoscMeinWykres';
import ObciazenieNauczycieliTabela from '@/components/dashboard/ObciazenieNauczycieliTabela';
import BrakiKadroweLista from '@/components/dashboard/BrakiKadroweLista';
import DashboardCTA from '@/components/dashboard/DashboardCTA';
import Top5Listy from '@/components/dashboard/Top5Listy';
import WskaznikRyzyka from '@/components/dashboard/WskaznikRyzyka';
import AlertyLista from '@/components/dashboard/AlertyLista';

export default function DashboardPage() {
  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState('2024/2025');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);

  const [typySzkol, setTypySzkol] = useState<Array<{ id: string; nazwa: string }>>([]);

  useEffect(() => {
    // Pobierz typy szkół
    console.log('Pobieranie typów szkół...');
    fetch('/api/typy-szkol')
      .then(res => {
        console.log('Status odpowiedzi:', res.status);
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || `HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        console.log('Otrzymane dane:', data);
        
        // Sprawdź czy to błąd
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Mapuj dane do formatu { id, nazwa }
        const mapped = Array.isArray(data) 
          ? data.map((item: any) => ({
              id: String(item.id || item._id || ''),
              nazwa: item.nazwa || item.tytul || item.name || 'Brak nazwy',
            }))
          : [];
        
        console.log('Zmapowane typy szkół:', mapped);
        setTypySzkol(mapped);
        setLadowanieTypow(false);
      })
      .catch(err => {
        console.error('Błąd przy pobieraniu typów szkół:', err);
        setLadowanieTypow(false);
        // Ustaw pustą tablicę, aby nie blokować interfejsu
        setTypySzkol([]);
      });
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      pobierzDane();
    } else {
      // Resetuj dane gdy nie ma wybranego typu szkoły
      setDane(null);
      setLadowanie(false);
    }
  }, [typSzkolyId, rokSzkolny]);

  const pobierzDane = async () => {
    setLadowanie(true);
    try {
      const [podsumowanie, zgodnosc, obciazenia, braki, wskaznikRyzyka, alerty] = await Promise.all([
        fetch(`/api/dashboard/podsumowanie?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/zgodnosc-mein?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/obciazenie-nauczycieli?rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/braki-kadrowe?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/wskaznik-ryzyka?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/alerty?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
      ]);

      // Sprawdź, czy odpowiedzi są poprawne
      if (!podsumowanie.ok) {
        throw new Error(`Błąd API podsumowanie: ${podsumowanie.status}`);
      }
      if (!zgodnosc.ok) {
        throw new Error(`Błąd API zgodność: ${zgodnosc.status}`);
      }
      if (!obciazenia.ok) {
        throw new Error(`Błąd API obciążenia: ${obciazenia.status}`);
      }
      if (!braki.ok) {
        throw new Error(`Błąd API braki: ${braki.status}`);
      }
      if (!wskaznikRyzyka.ok) {
        // Wskaźnik ryzyka nie jest krytyczny, więc tylko logujemy
        console.warn(`Błąd API wskaźnik ryzyka: ${wskaznikRyzyka.status}`);
      }
      if (!alerty.ok) {
        // Alerty nie są krytyczne, więc tylko logujemy
        console.warn(`Błąd API alerty: ${alerty.status}`);
      }

      const [podsumowanieData, zgodnoscData, obciazeniaData, brakiData, wskaznikRyzykaData, alertyData] = await Promise.all([
        podsumowanie.json(),
        zgodnosc.json(),
        obciazenia.json(),
        braki.json(),
        wskaznikRyzyka.ok ? wskaznikRyzyka.json() : Promise.resolve({ wskaznik: null }),
        alerty.ok ? alerty.json() : Promise.resolve({ alerty: [], statystyki: { lacznie: 0, bledy: 0, ostrzezenia: 0, informacje: 0 } }),
      ]);

      // Sprawdź, czy nie ma błędów w odpowiedziach
      if (podsumowanieData.error) {
        throw new Error(podsumowanieData.error);
      }
      if (zgodnoscData.error) {
        throw new Error(zgodnoscData.error);
      }
      if (obciazeniaData.error) {
        throw new Error(obciazeniaData.error);
      }
      if (brakiData.error) {
        throw new Error(brakiData.error);
      }

      setDane({
        podsumowanie: podsumowanieData,
        zgodnosc: zgodnoscData,
        obciazenia: obciazeniaData,
        braki: brakiData,
        wskaznikRyzyka: wskaznikRyzykaData.wskaznik,
        alerty: alertyData,
      });
    } catch (error) {
      console.error('Błąd przy pobieraniu danych:', error);
      setDane({
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    } finally {
      setLadowanie(false);
    }
  };

  if (ladowanieTypow) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie typów szkół...</p>
          <p className="mt-2 text-sm text-gray-400">Sprawdzanie połączenia z bazą danych...</p>
        </div>
      </div>
    );
  }

  if (typySzkol.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard Dyrektora</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold mb-2">Brak typów szkół</p>
          <p className="text-yellow-700 text-sm mb-4">
            Nie znaleziono żadnych typów szkół w bazie danych. Dodaj typy szkół przez panel administracyjny.
          </p>
          <a
            href="/admin/collections/typy-szkol"
            className="inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Przejdź do panelu admin
          </a>
        </div>
      </div>
    );
  }

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard Dyrektora</h1>
          <div className="flex gap-4">
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className="border rounded px-4 py-2"
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
            <input
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="Rok szkolny"
              className="border rounded px-4 py-2"
            />
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Ładowanie danych...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dane || !typSzkolyId) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard Dyrektora</h1>
          <div className="flex gap-4">
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className="border rounded px-4 py-2"
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
            <input
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="Rok szkolny"
              className="border rounded px-4 py-2"
            />
          </div>
        </div>
        {dane?.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Błąd:</p>
            <p className="text-red-700">{dane.error}</p>
            <button
              onClick={pobierzDane}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Wybierz typ szkoły z listy powyżej, aby zobaczyć dane.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Dyrektora</h1>
        <div className="flex gap-4">
          <select
            value={typSzkolyId}
            onChange={(e) => setTypSzkolyId(e.target.value)}
            className="border rounded px-4 py-2"
          >
            <option value="">Wybierz typ szkoły</option>
            {typySzkol.map(typ => (
              <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
            ))}
          </select>
          <input
            type="text"
            value={rokSzkolny}
            onChange={(e) => setRokSzkolny(e.target.value)}
            placeholder="Rok szkolny"
            className="border rounded px-4 py-2"
          />
        </div>
      </div>

      {/* Karty z podsumowaniem */}
      <DashboardKarty dane={dane.podsumowanie} />

      {/* Alerty */}
      {dane.alerty && dane.alerty.alerty && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Alerty i ostrzeżenia</h2>
          <AlertyLista alerty={dane.alerty.alerty} statystyki={dane.alerty.statystyki} />
        </div>
      )}

      {/* Wskaźnik ryzyka */}
      {dane.wskaznikRyzyka && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Wskaźnik ryzyka</h2>
          <WskaznikRyzyka wskaznik={dane.wskaznikRyzyka} />
        </div>
      )}

      {/* Szybkie akcje (CTA) */}
      <DashboardCTA typSzkolyId={typSzkolyId} rokSzkolny={rokSzkolny} />

      {/* Top 5 listy */}
      {typSzkolyId && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Podsumowania widoków</h2>
          <Top5Listy typSzkolyId={typSzkolyId} rokSzkolny={rokSzkolny} />
        </div>
      )}

      {/* Wykres zgodności z MEiN */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Zgodność z wymaganiami MEiN</h2>
        <ZgodnoscMeinWykres dane={dane.zgodnosc} />
      </div>

      {/* Obciążenie nauczycieli */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Obciążenie nauczycieli</h2>
        <ObciazenieNauczycieliTabela dane={dane.obciazenia} />
      </div>

      {/* Braki kadrowe */}
      {dane.braki?.braki?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Braki kadrowe</h2>
          <BrakiKadroweLista dane={dane.braki} />
        </div>
      )}
    </div>
  );
}
