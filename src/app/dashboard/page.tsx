'use client';

import { useEffect, useState } from 'react';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import KafelkiRealizacji, { type DaneRealizacji } from '@/components/dashboard/KafelkiRealizacji';
import { obliczRealizacjaZPrzydzialu } from '@/utils/realizacjaZPrzydzialu';

interface KlasaItem {
  id: string;
  nazwa: string;
  rok_szkolny: string;
  typ_szkoly: { id: string; nazwa?: string } | null;
}

/** Z zakresu rocznika (np. "2022-2027") zwraca rok szkolny do API: bieżący rok jeśli w zakresie, inaczej pierwszy rok */
function rokSzkolnyZRocznika(rocznik: string): string {
  const m = rocznik.match(/^(\d{4})-(\d{4})$/);
  if (!m) return '2024/2025';
  const start = Number(m[1]);
  const end = Number(m[2]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentSchoolYearStart = month >= 9 ? year : year - 1;
  if (currentSchoolYearStart >= start && currentSchoolYearStart <= end) {
    return `${currentSchoolYearStart}/${currentSchoolYearStart + 1}`;
  }
  return `${start}/${start + 1}`;
}

export default function DashboardPage() {
  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);

  const [typySzkol, setTypySzkol] = useState<Array<{ id: string; nazwa: string }>>([]);
  const [zgodnoscDane, setZgodnoscDane] = useState<DaneRealizacji | null>(null);
  const [zgodnoscLadowanie, setZgodnoscLadowanie] = useState(false);
  const [odswiezKafelki, setOdswiezKafelki] = useState(0);

  const roczniki = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
  const literki = selectedRocznik
    ? [...new Set(klasaList.filter((k) => k.rok_szkolny === selectedRocznik).map((k) => k.nazwa))].filter(Boolean).sort()
    : [];
  const selectedClass = klasaList.find(
    (k) => k.rok_szkolny === selectedRocznik && k.nazwa === selectedLitera
  );
  const rokSzkolny = selectedRocznik ? rokSzkolnyZRocznika(selectedRocznik) : '2024/2025';

  useEffect(() => {
    // Pobierz typy szkół (cache: no-store żeby zawsze mieć świeże dane z bazy)
    fetch('/api/typy-szkol', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || `HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        const mapped = list.map((item: any) => ({
          id: String(item.id || item._id || ''),
          nazwa: item.nazwa || item.tytul || item.name || 'Brak nazwy',
        }));
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
      setLadowanieKlas(true);
      setSelectedRocznik('');
      setSelectedLitera('');
      fetch(`/api/klasy?typSzkolyId=${typSzkolyId}`)
        .then((res) => res.json())
        .then((data) => {
          setKlasaList(data.klasy ?? []);
        })
        .catch(() => setKlasaList([]))
        .finally(() => setLadowanieKlas(false));
    } else {
      setKlasaList([]);
      setSelectedRocznik('');
      setSelectedLitera('');
    }
  }, [typSzkolyId]);

  useEffect(() => {
    if (typSzkolyId && selectedRocznik && selectedLitera) {
      setDane({ ok: true });
    } else {
      setDane(null);
    }
    setLadowanie(false);
  }, [typSzkolyId, selectedRocznik, selectedLitera]);

  // Realizacja: gdy wybrana klasa – z przypisanych godzin (localStorage); inaczej z API zgodnosc-mein
  const nazwaTypuSzkolyDoZgodnosci = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  useEffect(() => {
    if (!typSzkolyId || !selectedRocznik) {
      setZgodnoscDane(null);
      return;
    }
    if (selectedClass?.id && nazwaTypuSzkolyDoZgodnosci) {
      setZgodnoscLadowanie(false);
      setZgodnoscDane(obliczRealizacjaZPrzydzialu(nazwaTypuSzkolyDoZgodnosci, selectedClass.id));
      return;
    }
    const rok = rokSzkolnyZRocznika(selectedRocznik);
    setZgodnoscLadowanie(true);
    fetch(`/api/dashboard/zgodnosc-mein?typSzkolyId=${encodeURIComponent(typSzkolyId)}&rokSzkolny=${encodeURIComponent(rok)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setZgodnoscDane(null);
          return;
        }
        const wyniki = data.wyniki ?? [];
        const statystyki = data.statystyki ?? {};
        const brakiGodzin = wyniki
          .filter((w: { status: string }) => w.status === 'BRAK')
          .reduce((s: number, w: { roznica: { godziny: number } }) => s + Math.abs(w.roznica.godziny), 0);
        const nadwyzkiGodzin = wyniki
          .filter((w: { status: string }) => w.status === 'NADWYŻKA')
          .reduce((s: number, w: { roznica: { godziny: number } }) => s + w.roznica.godziny, 0);
        setZgodnoscDane({
          procentRealizacji: Number(statystyki.sredniProcent) ?? 0,
          brakiGodzin,
          nadwyzkiGodzin,
          liczbaBrakow: statystyki.zBrakami,
          liczbaNadwyzek: statystyki.zNadwyzkami,
        });
      })
      .catch(() => setZgodnoscDane(null))
      .finally(() => setZgodnoscLadowanie(false));
  }, [typSzkolyId, selectedRocznik, selectedClass?.id, nazwaTypuSzkolyDoZgodnosci, odswiezKafelki]);

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

  const SelectyKaskadowe = () => (
    <div className="flex flex-wrap gap-4 items-center">
      <select
        value={typSzkolyId}
        onChange={(e) => setTypSzkolyId(e.target.value)}
        className="border rounded px-4 py-2 min-w-[200px]"
      >
        <option value="">Wybierz typ szkoły</option>
        {typySzkol.map((typ) => (
          <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
        ))}
      </select>
      <select
        value={selectedRocznik}
        onChange={(e) => {
          setSelectedRocznik(e.target.value);
          setSelectedLitera('');
        }}
        disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
        className="border rounded px-4 py-2 min-w-[140px]"
      >
        <option value="">Rocznik</option>
        {roczniki.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select
        value={selectedLitera}
        onChange={(e) => setSelectedLitera(e.target.value)}
        disabled={!selectedRocznik || literki.length === 0}
        className="border rounded px-4 py-2 min-w-[100px]"
      >
        <option value="">Klasa</option>
        {literki.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      {selectedClass && (
        <span className="text-sm text-gray-600">
          Wybrana klasa: <strong>{selectedClass.nazwa}</strong> ({selectedRocznik})
        </span>
      )}
    </div>
  );

  if (!dane || !typSzkolyId || !selectedRocznik || !selectedLitera) {
    const nazwaTypuSzkolyShort = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard Dyrektora</h1>
          <SelectyKaskadowe />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Wybierz <strong>typ szkoły</strong>, potem <strong>rocznik</strong> (zakres lat), a na końcu <strong>klasę</strong> (literę) – wtedy załadują się dane tej klasy w dashboardzie.
          </p>
          {typSzkolyId && !ladowanieKlas && roczniki.length === 0 && (
            <p className="text-amber-700 text-sm mt-2">Brak klas dla wybranego typu szkoły. Dodaj klasy w panelu admina.</p>
          )}
        </div>
        {/* Wykres kołowy + kafelki: procent realizacji, braki godzin, nadwyżki */}
        {typSzkolyId && selectedRocznik && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Realizacja wymagań MEiN</h2>
            <KafelkiRealizacji
              dane={zgodnoscDane}
              ladowanie={zgodnoscLadowanie}
              brakDanychKomunikat="Wybierz typ szkoły i rocznik, aby zobaczyć statystyki realizacji."
            />
          </div>
        )}
        {/* Plan MEiN widoczny od razu po wyborze typu szkoły */}
        {nazwaTypuSzkolyShort && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Plan ramowy MEiN – przedmioty i wymagane godziny w latach</h2>
            <p className="text-gray-600 text-sm">
              Wymagania MEiN dla wybranego typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
            </p>
            <PlanMeinTabela nazwaTypuSzkoly={nazwaTypuSzkolyShort} />
          </div>
        )}
      </div>
    );
  }

  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Dashboard Dyrektora</h1>
        <SelectyKaskadowe />
      </div>

      {/* Wykres kołowy + kafelki: procent realizacji, braki godzin, nadwyżki */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Realizacja wymagań MEiN</h2>
        <KafelkiRealizacji
          dane={zgodnoscDane}
          ladowanie={zgodnoscLadowanie}
          brakDanychKomunikat="Brak danych zgodności dla wybranego typu i rocznika."
        />
      </div>

      {/* Plan ramowy MEiN */}
      {nazwaTypuSzkoly && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Plan ramowy MEiN – przedmioty i wymagane godziny w latach</h2>
          <p className="text-gray-600 text-sm">
            Wymagania MEiN dla wybranego typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
          </p>
          <PlanMeinTabela
          nazwaTypuSzkoly={nazwaTypuSzkoly}
          klasaId={selectedClass?.id}
          onPrzydzialChange={() => setOdswiezKafelki((n) => n + 1)}
          onDoradztwoChange={() => setOdswiezKafelki((n) => n + 1)}
        />
        </div>
      )}
    </div>
  );
}
