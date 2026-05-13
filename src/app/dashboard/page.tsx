'use client';

import { useEffect, useState } from 'react';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly, getZapamietanyRocznik, zapiszRocznik, getZapamietanaLitera, zapiszLitera } from '@/utils/typSzkolyStorage';
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
        const zap = getZapamietanyTypSzkoly();
        if (zap && mapped.some((t: { id: string }) => t.id === zap)) {
          setTypSzkolyId(zap);
        }
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
    if (!typSzkolyId || ladowanieKlas || !klasaList.length) return;
    const rocznikiList = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
    const zapR = getZapamietanyRocznik();
    const zapL = getZapamietanaLitera();
    if (zapR && rocznikiList.includes(zapR)) {
      setSelectedRocznik(zapR);
      const literkiList = [...new Set(klasaList.filter((k) => k.rok_szkolny === zapR).map((k) => k.nazwa))].filter(Boolean).sort();
      if (zapL && literkiList.includes(zapL)) {
        setSelectedLitera(zapL);
      }
    }
  }, [klasaList, typSzkolyId, ladowanieKlas]);

  useEffect(() => {
    if (typSzkolyId && selectedRocznik && selectedLitera) {
      setDane({ ok: true });
    } else {
      setDane(null);
    }
    setLadowanie(false);
  }, [typSzkolyId, selectedRocznik, selectedLitera]);

  // Realizacja wymagań: tylko gdy wybrana pełna klasa – dane z API (dla szkoły: godziny do wyboru, doradztwo, dyrektor, rozszerzenia)
  const nazwaTypuSzkolyDoZgodnosci = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  useEffect(() => {
    if (!typSzkolyId || !selectedRocznik || !selectedClass?.id || !nazwaTypuSzkolyDoZgodnosci) {
      setZgodnoscDane(null);
      setZgodnoscLadowanie(false);
      return;
    }
    setZgodnoscLadowanie(true);
    let cancelled = false;
    fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(selectedClass.id)}&_t=${odswiezKafelki}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data: {
        przydzial?: Record<string, Record<string, number>>;
        doradztwo?: Record<string, Record<string, number>>;
        dyrektor?: Record<string, Record<string, number>>;
        rozszerzenia?: string[];
        rozszerzeniaPrzydzial?: Record<string, Record<string, number>>;
        podzialNaGrupy?: Record<string, Record<string, boolean>>;
        przydzialGrupy?: Record<string, Record<string, [number, number] | { 1?: number; 2?: number }>>;
        dyrektorGrupy?: Record<string, Record<string, [number, number] | { 1?: number; 2?: number }>>;
        rozszerzeniaGrupy?: Record<string, Record<string, [number, number] | { 1?: number; 2?: number }>>;
      }) => {
        if (cancelled) return;
        const daneZApi = {
          przydzial: data.przydzial ?? {},
          doradztwo: data.doradztwo ?? {},
          dyrektor: data.dyrektor ?? {},
          rozszerzenia: data.rozszerzenia,
          rozszerzeniaPrzydzial: data.rozszerzeniaPrzydzial ?? {},
          podzialNaGrupy: data.podzialNaGrupy,
          przydzialGrupy: data.przydzialGrupy,
          dyrektorGrupy: data.dyrektorGrupy,
          rozszerzeniaGrupy: data.rozszerzeniaGrupy,
        };
        setZgodnoscDane(obliczRealizacjaZPrzydzialu(nazwaTypuSzkolyDoZgodnosci, selectedClass!.id, daneZApi));
      })
      .catch(() => {
        if (!cancelled) setZgodnoscDane(null);
      })
      .finally(() => {
        if (!cancelled) setZgodnoscLadowanie(false);
      });
    return () => { cancelled = true; };
  }, [typSzkolyId, selectedRocznik, selectedClass?.id, nazwaTypuSzkolyDoZgodnosci, odswiezKafelki]);

  if (ladowanieTypow) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
        <div className="edu-spinner h-11 w-11 sm:h-12 sm:w-12" role="status" />
        <p className="mt-5 text-base font-semibold text-edu-ink sm:text-lg">Ładowanie typów szkół...</p>
        <p className="mt-2 text-sm text-edu-muted">Sprawdzanie połączenia z bazą danych.</p>
      </div>
    );
  }

  if (typySzkol.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="font-serif text-2xl font-semibold text-edu-ink sm:mb-6 sm:text-3xl">Dashboard dyrektora</h1>
        <div className="mt-4 max-w-2xl rounded-xl border border-amber-200/80 bg-edu-warning-soft p-5 shadow-edu-sm">
          <p className="text-base font-semibold text-edu-warning">Brak typów szkół</p>
          <p className="mt-2 text-sm leading-relaxed text-edu-muted">
            Nie znaleziono żadnych typów szkół w bazie danych. Dodaj je w panelu konfiguracyjnym, aby
            uruchomić pracę nad siatką.
          </p>
          <a
            href="/panel-admin"
            className="edu-focus-ring edu-press mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-edu-warning px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          >
            Otwórz panel konfiguracji
          </a>
        </div>
      </div>
    );
  }

  const SelectyKaskadowe = () => (
    <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto sm:flex-shrink-0">
      <select
        value={typSzkolyId}
        onChange={(e) => {
          const v = e.target.value;
          zapiszTypSzkoly(v);
          setTypSzkolyId(v);
        }}
        className="min-h-11 w-full rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm font-medium text-edu-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-edu-accent sm:w-[220px] sm:min-w-0"
      >
        <option value="">Wybierz typ szkoły</option>
        {typySzkol.map((typ) => (
          <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
        ))}
      </select>
      <select
        value={selectedRocznik}
        onChange={(e) => {
          const v = e.target.value;
          zapiszRocznik(v);
          setSelectedRocznik(v);
          setSelectedLitera('');
        }}
        disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
        className="min-h-11 w-full rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm font-medium text-edu-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-edu-accent disabled:opacity-55 sm:w-[150px] sm:min-w-0"
      >
        <option value="">Rocznik</option>
        {roczniki.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select
        value={selectedLitera}
        onChange={(e) => {
          const v = e.target.value;
          zapiszLitera(v);
          setSelectedLitera(v);
        }}
        disabled={!selectedRocznik || literki.length === 0}
        className="min-h-11 w-full rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm font-medium text-edu-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-edu-accent disabled:opacity-55 sm:w-[110px] sm:min-w-0"
      >
        <option value="">Klasa</option>
        {literki.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      {selectedClass && (
        <span className="mt-1 block text-sm font-medium text-edu-muted sm:mt-0 sm:inline sm:whitespace-nowrap">
          Wybrana klasa:{' '}
          <strong className="text-edu-ink">{selectedClass.nazwa}</strong> ({selectedRocznik})
        </span>
      )}
    </div>
  );

  if (!dane || !typSzkolyId || !selectedRocznik || !selectedLitera) {
    const nazwaTypuSzkolyShort = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
    return (
      <div className="max-w-full space-y-6 overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-2xl font-semibold text-edu-ink sm:text-3xl">Dashboard dyrektora</h1>
          <SelectyKaskadowe />
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-edu-warning-soft p-5 shadow-edu-sm">
          <p className="text-sm leading-relaxed text-edu-muted sm:text-[15px]">
            Wybierz <strong className="text-edu-ink">typ szkoły</strong>, następnie{' '}
            <strong className="text-edu-ink">rocznik</strong> oraz{' '}
            <strong className="text-edu-ink">klasę</strong> — aby wczytać pełny podgląd realizacji dla danej
            grupy.
          </p>
          {typSzkolyId && !ladowanieKlas && roczniki.length === 0 && (
            <p className="mt-3 text-sm font-medium text-edu-warning">
              Brak klas dla wybranego typu. Uzupełnij strukturę w panelu administratora.
            </p>
          )}
        </div>
        {/* Realizacja wymagań – tylko gdy wybrana pełna klasa (typ + rocznik + litera) */}
        {typSzkolyId && selectedRocznik && selectedLitera && selectedClass && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-edu-ink sm:text-xl">Realizacja wymagań MEiN</h2>
            <KafelkiRealizacji
              dane={zgodnoscDane}
              ladowanie={zgodnoscLadowanie}
              brakDanychKomunikat="Wybierz typ szkoły, rocznik i klasę, aby zobaczyć statystyki realizacji."
            />
          </div>
        )}
        {/* Plan MEiN widoczny od razu po wyborze typu szkoły */}
        {nazwaTypuSzkolyShort && (
          <div className="space-y-2 min-w-0">
            <h2 className="text-lg font-semibold text-edu-ink sm:text-xl">
              Plan ramowy MEiN — przedmioty i wymagane godziny
            </h2>
            <p className="text-sm leading-relaxed text-edu-muted">
              Wymagania MEiN dla wybranego typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
            </p>
            <PlanMeinTabela nazwaTypuSzkoly={nazwaTypuSzkolyShort} tylkoOdczyt />
          </div>
        )}
      </div>
    );
  }

  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';

  return (
    <div className="max-w-full space-y-6 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-semibold text-edu-ink sm:text-3xl">Dashboard dyrektora</h1>
        <SelectyKaskadowe />
      </div>

      {/* Wykres kołowy + kafelki: procent realizacji, braki godzin, nadwyżki */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-edu-ink sm:text-xl">Realizacja wymagań MEiN</h2>
        <KafelkiRealizacji
          dane={zgodnoscDane}
          ladowanie={zgodnoscLadowanie}
          brakDanychKomunikat="Brak danych zgodności dla wybranego typu i rocznika."
        />
      </div>

      {/* Plan ramowy MEiN */}
      {nazwaTypuSzkoly && (
        <div className="space-y-2 min-w-0">
          <h2 className="text-lg font-semibold text-edu-ink sm:text-xl">
            Plan ramowy MEiN — przedmioty i wymagane godziny
          </h2>
          <p className="text-sm leading-relaxed text-edu-muted">
            Wymagania MEiN dla wybranego typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
          </p>
          <PlanMeinTabela
            nazwaTypuSzkoly={nazwaTypuSzkoly}
            klasaId={selectedClass?.id}
            tylkoOdczyt
            onPrzydzialChange={() => setOdswiezKafelki((n) => n + 1)}
            onDoradztwoChange={() => setOdswiezKafelki((n) => n + 1)}
          />
        </div>
      )}
    </div>
  );
}
