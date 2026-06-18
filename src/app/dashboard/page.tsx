'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly, getZapamietanyRocznik, zapiszRocznik, getZapamietanaLitera, zapiszLitera } from '@/utils/typSzkolyStorage';
import KafelkiRealizacji, { type DaneRealizacji } from '@/components/dashboard/KafelkiRealizacji';
import AgregatSzkoly from '@/components/dashboard/AgregatSzkoly';
import { obliczRealizacjaZPrzydzialu } from '@/utils/realizacjaZPrzydzialu';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';

/** Wspólny styl selektora kaskadowego (tokeny). */
const SELECT_CLASS =
  'border border-line-strong rounded-sm px-3 py-2 text-sm bg-surface text-ink disabled:opacity-60';

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
        const mapped = (list as Array<{ id?: string | number; _id?: string | number; nazwa?: string; tytul?: string; name?: string }>).map((item) => ({
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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent sm:h-12 sm:w-12" />
          <p className="mt-4 text-base text-ink-soft sm:text-lg">Ładowanie typów szkół…</p>
          <p className="mt-2 text-sm text-ink-faint">Sprawdzanie połączenia z bazą danych…</p>
        </div>
      </div>
    );
  }

  if (typySzkol.length === 0) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <PageHeader title="Dashboard" description="Przegląd zgodności z planem ramowym MEiN." />
        <div className="rounded-card border border-warn/30 bg-warn-bg p-5">
          <p className="text-base font-semibold text-warn">Brak typów szkół</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Nie znaleziono żadnych typów szkół w bazie danych. Dodaj typy szkół przez panel administracyjny.
          </p>
          <Link href="/panel-admin" className={`mt-4 ${buttonClass('primary')}`}>
            Przejdź do panelu admina
          </Link>
        </div>
      </div>
    );
  }

  const SelectyKaskadowe = () => (
    <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto sm:shrink-0">
      <select
        value={typSzkolyId}
        onChange={(e) => {
          const v = e.target.value;
          zapiszTypSzkoly(v);
          setTypSzkolyId(v);
        }}
        aria-label="Typ szkoły"
        className={`w-full sm:w-[200px] sm:min-w-0 ${SELECT_CLASS}`}
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
        aria-label="Rocznik"
        className={`w-full sm:w-[140px] sm:min-w-0 ${SELECT_CLASS}`}
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
        aria-label="Klasa"
        className={`w-full sm:w-[100px] sm:min-w-0 ${SELECT_CLASS}`}
      >
        <option value="">Klasa</option>
        {literki.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      {selectedClass && (
        <span className="text-sm text-ink-soft block sm:inline sm:whitespace-nowrap mt-1 sm:mt-0">
          Wybrana klasa: <strong className="text-ink">{selectedClass.nazwa}</strong> ({selectedRocznik})
        </span>
      )}
    </div>
  );

  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  const klasaWybrana = Boolean(typSzkolyId && selectedRocznik && selectedLitera && selectedClass);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Dashboard"
        description="Przegląd zgodności z planem ramowym MEiN — agregat całoszkolny."
        actions={<SelectyKaskadowe />}
      />

      {/* Agregat całoszkolny — gdy wybrany typ szkoły (nie wymaga pełnej klasy) */}
      {typSzkolyId ? (
        <AgregatSzkoly typSzkolyId={typSzkolyId} rokSzkolny={rokSzkolny} />
      ) : (
        <div className="rounded-card border border-accent/20 bg-accent-weak p-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Wybierz <strong className="text-ink">typ szkoły</strong>, aby zobaczyć agregat całoszkolny.
            Dodatkowo wskaż <strong className="text-ink">rocznik</strong> i <strong className="text-ink">klasę</strong>,
            aby otworzyć podgląd pojedynczej klasy.
          </p>
        </div>
      )}

      {typSzkolyId && !ladowanieKlas && roczniki.length === 0 && (
        <p role="status" aria-live="polite" className="text-sm text-warn">
          Brak klas dla wybranego typu szkoły. Dodaj klasy w panelu admina.
        </p>
      )}

      {/* Podgląd klasy — dotychczasowy widok per-klasa (realizacja + plan), zachowana funkcja */}
      {typSzkolyId && (
        <section className="space-y-5 min-w-0">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Podgląd klasy</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {klasaWybrana
                ? `Realizacja wymagań i plan ramowy dla klasy ${selectedClass?.nazwa} (${selectedRocznik}).`
                : 'Wybierz rocznik i klasę powyżej, aby zobaczyć realizację wymagań tej klasy.'}
            </p>
          </div>

          {klasaWybrana && (
            <div className="space-y-3">
              <h3 className="font-display text-base font-semibold text-ink">Realizacja wymagań MEiN</h3>
              <KafelkiRealizacji
                dane={zgodnoscDane}
                ladowanie={zgodnoscLadowanie}
                brakDanychKomunikat="Brak danych zgodności dla wybranej klasy."
              />
            </div>
          )}

          {/* Plan ramowy MEiN — widoczny od razu po wyborze typu szkoły */}
          {nazwaTypuSzkoly && (
            <div className="space-y-2 min-w-0">
              <h3 className="font-display text-base font-semibold text-ink">
                Plan ramowy MEiN – przedmioty i wymagane godziny w latach
              </h3>
              <p className="text-sm leading-relaxed text-ink-soft">
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
        </section>
      )}
    </div>
  );
}
