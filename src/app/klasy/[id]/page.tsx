'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import KafelkiRealizacji, { type DaneRealizacji } from '@/components/dashboard/KafelkiRealizacji';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import { obliczRealizacjaZPrzydzialu } from '@/utils/realizacjaZPrzydzialu';
import PageHeader from '@/components/ui/PageHeader';
import Button, { buttonClass } from '@/components/ui/Button';
import AsyncSection from '@/components/ui/AsyncSection';
import Icon from '@/components/ui/Icon';
import type { KlasaSzczegoly } from '@/types/api';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';

export default function KlasaPage() {
  const params = useParams();
  const router = useRouter();
  const klasaId = params.id as string;

  const [dane, setDane] = useState<KlasaSzczegoly | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zgodnoscDane, setZgodnoscDane] = useState<DaneRealizacji | null>(null);

  useEffect(() => {
    if (klasaId) {
      pobierzDane();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <AsyncSection loading loadingLabel="Ładowanie danych klasy...">
          {null}
        </AsyncSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <AsyncSection loading={false} error={error}>
          {null}
        </AsyncSection>
        <Button variant="secondary" onClick={() => router.back()}>
          <Icon name="back" size={16} />
          Wróć
        </Button>
      </div>
    );
  }

  if (!dane) {
    return null;
  }

  const profil = dane.klasa.profil;
  const opis = [
    profil ? `Profil: ${profil}` : null,
    `${dane.klasa.typ_szkoly.nazwa} • Rok szkolny: ${dane.klasa.rok_szkolny}`,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Klasa ${dane.klasa.nazwa}`}
        description={opis}
        actions={
          <>
            <Link href="/klasy" className={buttonClass('ghost')}>
              <Icon name="back" size={16} />
              Wróć do klas
            </Link>
            <Link href="/przydzial" className={buttonClass('primary')}>
              Przydział
            </Link>
          </>
        }
      />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-ink">Realizacja wymagań MEiN</h2>
        <KafelkiRealizacji
          dane={zgodnoscDane}
          ladowanie={false}
          brakDanychKomunikat="Brak danych przydziału dla tej klasy (godziny do wyboru, doradztwo, dyrektorskie)."
        />
      </div>

      {dane.klasa.typ_szkoly?.nazwa && (
        <div className="min-w-0 space-y-2">
          <h2 className="text-lg font-semibold text-ink">
            Plan ramowy MEiN – przedmioty i wymagane godziny w latach
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Wymagania MEiN dla typu szkoły (godziny tygodniowo w klasach oraz razem w cyklu).
          </p>
          <PlanMeinTabela nazwaTypuSzkoly={dane.klasa.typ_szkoly.nazwa} klasaId={klasaId} tylkoOdczyt />
        </div>
      )}
    </div>
  );
}
