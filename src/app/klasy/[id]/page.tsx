'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import KafelkiRealizacji, { type DaneRealizacji } from '@/components/dashboard/KafelkiRealizacji';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import { obliczRealizacjaZPrzydzialu } from '@/utils/realizacjaZPrzydzialu';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';

export default function KlasaPage() {
  const params = useParams();
  const router = useRouter();
  const klasaId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zgodnoscDane, setZgodnoscDane] = useState<DaneRealizacji | null>(null);

  useEffect(() => {
    if (klasaId) {
      pobierzDane();
    }
  }, [klasaId]);

  // Po załadowaniu klasy: pobierz przydział z API, zapisz do localStorage, policz realizację (jak na dashboardzie)
  useEffect(() => {
    if (!dane?.klasa?.typ_szkoly?.nazwa || !klasaId) {
      setZgodnoscDane(null);
      return;
    }
    const nazwaTypu = dane.klasa.typ_szkoly.nazwa;
    fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(klasaId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((api: {
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
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_PREFIX + klasaId, JSON.stringify(api.przydzial ?? {}));
            localStorage.setItem(STORAGE_DORADZTWO + klasaId, JSON.stringify(api.doradztwo ?? {}));
            localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(api.dyrektor ?? {}));
          } catch (err) {
            // localStorage to nietrwały cache (źródło prawdy: API) — pomijamy błąd zapisu, nie połykamy po cichu
            console.debug('Pominięto zapis cache localStorage (klasa):', err);
          }
        }
        const daneZApi = {
          przydzial: api.przydzial,
          doradztwo: api.doradztwo,
          dyrektor: api.dyrektor,
          rozszerzenia: api.rozszerzenia,
          rozszerzeniaPrzydzial: api.rozszerzeniaPrzydzial,
          podzialNaGrupy: api.podzialNaGrupy,
          przydzialGrupy: api.przydzialGrupy,
          dyrektorGrupy: api.dyrektorGrupy,
          rozszerzeniaGrupy: api.rozszerzeniaGrupy,
        };
        setZgodnoscDane(obliczRealizacjaZPrzydzialu(nazwaTypu, klasaId, daneZApi));
      })
      .catch(() => setZgodnoscDane(obliczRealizacjaZPrzydzialu(nazwaTypu, klasaId)));
  }, [dane, klasaId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/klasy/${klasaId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych klasy:', err);
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
            <p className="mt-4 text-ink-soft">Ładowanie danych klasy...</p>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Klasa {dane.klasa.nazwa}</h1>
          {dane.klasa.profil && (
            <p className="text-ink-soft mt-1">Profil: {dane.klasa.profil}</p>
          )}
          <p className="text-sm text-ink-faint mt-1">
            {dane.klasa.typ_szkoly.nazwa} • Rok szkolny: {dane.klasa.rok_szkolny}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/klasy"
            className="px-4 py-2 bg-line hover:bg-line-strong rounded font-medium"
          >
            ← Wróć do klas
          </Link>
          <Link
            href="/przydzial"
            className="px-4 py-2 bg-accent text-white hover:bg-accent-strong rounded font-medium"
          >
            Przydział
          </Link>
        </div>
      </div>

      {/* Realizacja wymagań MEiN – jak na dashboardzie */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-ink">Realizacja wymagań MEiN</h2>
        <KafelkiRealizacji
          dane={zgodnoscDane}
          ladowanie={false}
          brakDanychKomunikat="Brak danych przydziału dla tej klasy (godziny do wyboru, doradztwo, dyrektorskie)."
        />
      </div>

      {/* Plan ramowy MEiN – jak na dashboardzie (tylko odczyt) */}
      {dane.klasa.typ_szkoly?.nazwa && (
        <div className="space-y-2 min-w-0">
          <h2 className="text-xl font-semibold text-ink">Plan ramowy MEiN – przedmioty i wymagane godziny w latach</h2>
          <p className="text-ink-soft text-sm leading-relaxed">
            Wymagania MEiN dla typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
          </p>
          <PlanMeinTabela
            nazwaTypuSzkoly={dane.klasa.typ_szkoly.nazwa}
            klasaId={klasaId}
            tylkoOdczyt
          />
        </div>
      )}
    </div>
  );
}
