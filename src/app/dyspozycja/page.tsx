'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import plansData from '@/utils/import/ramowe-plany.json';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly, getZapamietanyRocznik, zapiszRocznik, getZapamietanaLitera, zapiszLitera } from '@/utils/typSzkolyStorage';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button, { buttonClass } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusPill from '@/components/ui/StatusPill';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import PrzydzielModal from '@/components/dyspozycja/PrzydzielModal';
import { useKomorkaKlawiatura } from '@/lib/hooks/useKomorkaKlawiatura';
import {
  type PlanItem,
  getGradesFromPlan,
  matchSchoolType,
  cycleFilterZNazwy,
  aktualnyRokWCykle,
  obliczPrzedmiotyDlaRoku,
} from '@/lib/dyspozycja/plan';

type WierszPrzedmiotu = { nazwa: string; godziny: number; doPrzydzielenia: number };

/** Status „Do przydzielenia" jako tekst (nie sam kolor): gotowe / brakuje N. */
function statusPrzydzielenia(doPrz: number): { status: string; label: string } {
  if (doPrz <= 0) return { status: 'OK', label: 'gotowe' };
  return { status: 'BRAK', label: `brakuje ${doPrz}` };
}

/**
 * Komórka „Do przydzielenia" — klikalna w trybie przydziału (semantyka przycisku z klawiatury).
 * Hook `useKomorkaKlawiatura` wywołany w osobnym komponencie (nie w `.map`), zgodnie z rules-of-hooks.
 */
function KomorkaDoPrzydzielenia({
  row,
  klikalny,
  onActivate,
}: {
  row: WierszPrzedmiotu;
  klikalny: boolean;
  onActivate: () => void;
}) {
  const kbd = useKomorkaKlawiatura(onActivate);
  const { status, label } = statusPrzydzielenia(row.doPrzydzielenia);
  const pill = (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="text-ink-soft">{row.doPrzydzielenia}</span>
      <StatusPill status={status} label={label} />
    </span>
  );
  if (!klikalny) return pill;
  return (
    <span
      {...kbd}
      aria-label={`Przydziel nauczyciela: ${row.nazwa}, do przydzielenia ${row.doPrzydzielenia}`}
      className="inline-flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-accent hover:bg-surface-2"
    >
      {pill}
    </span>
  );
}

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface KlasaItem {
  id: string;
  nazwa: string;
  rok_szkolny: string;
  typ_szkoly: { id: string; nazwa?: string } | null;
}

const allPlans: PlanItem[] = (plansData as { plans?: PlanItem[] }).plans ?? [];

export default function DyspozycjaPage() {
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [bladKlas, setBladKlas] = useState<string | null>(null);
  const [bladPrzydzial, setBladPrzydzial] = useState<string | null>(null);
  const [przydzialData, setPrzydzialData] = useState<{
    przydzial: Record<string, Record<string, number>>;
    dyrektor: Record<string, Record<string, number>>;
    doradztwo: Record<string, Record<string, number>>;
    rozszerzenia: string[];
    rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
    podzialNaGrupy?: Record<string, Record<string, boolean>>;
    przydzialGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
    dyrektorGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
    rozszerzeniaGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
  } | null>(null);
  const [ladowaniePrzydzial, setLadowaniePrzydzial] = useState(false);
  const [trybPrzydziel, setTrybPrzydziel] = useState(false);
  const [modalRow, setModalRow] = useState<WierszPrzedmiotu | null>(null);
  const [modalGodziny, setModalGodziny] = useState(1);
  const [modalNauczycielId, setModalNauczycielId] = useState('');
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikatPrzydziel, setKomunikatPrzydziel] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);
  const [przedmioty, setPrzedmioty] = useState<{ id: string; nazwa: string }[]>([]);
  const [nauczyciele, setNauczyciele] = useState<{ id: string; imie: string; nazwisko: string; przedmioty: { id: string; nazwa?: string }[] }[]>([]);
  const [nauczycieleLoading, setNauczycieleLoading] = useState(false);
  const [nauczycieleError, setNauczycieleError] = useState(false);
  /** Przypisane godziny per (przedmiotId, rok) – do wyliczenia „Do przydzielenia”. */
  const [assignedGodziny, setAssignedGodziny] = useState<Record<string, Record<string, number>> | null>(null);

  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  const cycleFilter = cycleFilterZNazwy(nazwaTypuSzkoly);
  const plan = allPlans.find(
    (p) => matchSchoolType(nazwaTypuSzkoly, p.school_type) && (!cycleFilter || p.cycle === cycleFilter)
  );
  const rokiPlanu = plan ? getGradesFromPlan(plan) : [];

  const roczniki = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
  const literki = selectedRocznik
    ? [...new Set(klasaList.filter((k) => k.rok_szkolny === selectedRocznik).map((k) => k.nazwa))].filter(Boolean).sort()
    : [];
  const selectedClass = klasaList.find(
    (k) => k.rok_szkolny === selectedRocznik && k.nazwa === selectedLitera
  );

  /** Rok w cyklu (I, II, III…) – automatycznie na podstawie rzeczywistej daty i cyklu klasy. */
  const selectedRok =
    selectedRocznik && rokiPlanu.length > 0 ? aktualnyRokWCykle(selectedRocznik, rokiPlanu) : '';

  /** Godziny na dany rok = baza z planu + przydział + dyrektor; doPrzydzielenia = godziny minus już przypisane. */
  const przedmiotyDlaRoku =
    plan && selectedRok
      ? obliczPrzedmiotyDlaRoku(plan, selectedRok, przydzialData, przedmioty, assignedGodziny)
      : [];

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      setLadowanieKlas(true);
      setBladKlas(null);
      setSelectedRocznik('');
      setSelectedLitera('');
      fetch(`/api/klasy?typSzkolyId=${typSzkolyId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data) => {
          setKlasaList(data.klasy ?? []);
        })
        .catch((err) => {
          setBladKlas(err instanceof Error ? err.message : 'Błąd pobierania klas');
          setKlasaList([]);
        })
        .finally(() => setLadowanieKlas(false));
    } else {
      setKlasaList([]);
      setBladKlas(null);
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
    if (!selectedClass?.id) {
      setPrzydzialData(null);
      setAssignedGodziny(null);
      return;
    }
    setLadowaniePrzydzial(true);
    setBladPrzydzial(null);
    Promise.all([
      fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(selectedClass.id)}`, { cache: 'no-store' }).then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed')))),
      fetch('/api/przedmioty', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([data, przedmiotyRes]: [unknown, unknown]) => {
        const d = data as {
          przydzial?: Record<string, Record<string, number>>;
          dyrektor?: Record<string, Record<string, number>>;
          doradztwo?: Record<string, Record<string, number>>;
          rozszerzenia?: string[];
          rozszerzeniaPrzydzial?: Record<string, Record<string, number>>;
          podzialNaGrupy?: Record<string, Record<string, boolean>>;
          przydzialGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
          dyrektorGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
          rozszerzeniaGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
        };
        setPrzydzialData({
          przydzial: d.przydzial && typeof d.przydzial === 'object' ? d.przydzial : {},
          dyrektor: d.dyrektor && typeof d.dyrektor === 'object' ? d.dyrektor : {},
          doradztwo: d.doradztwo && typeof d.doradztwo === 'object' ? d.doradztwo : {},
          rozszerzenia: Array.isArray(d.rozszerzenia) ? d.rozszerzenia : [],
          rozszerzeniaPrzydzial: d.rozszerzeniaPrzydzial && typeof d.rozszerzeniaPrzydzial === 'object' ? d.rozszerzeniaPrzydzial : {},
          podzialNaGrupy: d.podzialNaGrupy && typeof d.podzialNaGrupy === 'object' ? d.podzialNaGrupy : {},
          przydzialGrupy: d.przydzialGrupy && typeof d.przydzialGrupy === 'object' ? d.przydzialGrupy : {},
          dyrektorGrupy: d.dyrektorGrupy && typeof d.dyrektorGrupy === 'object' ? d.dyrektorGrupy : {},
          rozszerzeniaGrupy: d.rozszerzeniaGrupy && typeof d.rozszerzeniaGrupy === 'object' ? d.rozszerzeniaGrupy : {},
        });
        const pList = (Array.isArray(przedmiotyRes)
          ? przedmiotyRes
          : (przedmiotyRes as { przedmioty?: unknown[] })?.przedmioty ?? []) as Array<{ id: string; nazwa?: string }>;
        setPrzedmioty(pList.map((p) => ({ id: String(p.id), nazwa: p.nazwa ?? '' })));
      })
      .catch((err) => {
        console.error('Nie udało się pobrać przydziału/przedmiotów:', err);
        setBladPrzydzial(err instanceof Error ? err.message : 'Błąd pobierania danych przydziału');
        setPrzydzialData(null);
      })
      .finally(() => setLadowaniePrzydzial(false));
  }, [selectedClass?.id]);

  useEffect(() => {
    if (!selectedClass?.id || !selectedRocznik) {
      setAssignedGodziny(null);
      return;
    }
    const rokNorm = selectedRocznik.replace(/-/g, '/');
    fetch(`/api/dyspozycja/przydziel?klasaId=${encodeURIComponent(selectedClass.id)}&rokSzkolny=${encodeURIComponent(rokNorm)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data: { assigned?: Record<string, Record<string, number>> }) => {
        setAssignedGodziny(data.assigned && typeof data.assigned === 'object' ? data.assigned : {});
      })
      .catch(() => setAssignedGodziny({}));
  }, [selectedClass?.id, selectedRocznik]);

  useEffect(() => {
    if (!trybPrzydziel && !modalRow) return;
    setNauczycieleLoading(true);
    setNauczycieleError(false);
    Promise.all([
      fetch('/api/przedmioty', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('przedmioty')))),
      fetch('/api/nauczyciele', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('nauczyciele')))),
    ]).then(([przedmiotyRes, nauczycieleRes]) => {
      const pList = Array.isArray(przedmiotyRes) ? przedmiotyRes : przedmiotyRes?.error ? [] : (przedmiotyRes?.przedmioty ?? []);
      setPrzedmioty(pList.map((p: { id: string; nazwa?: string }) => ({ id: String(p.id), nazwa: p.nazwa ?? '' })));
      const nList = Array.isArray(nauczycieleRes) ? nauczycieleRes : nauczycieleRes?.error ? [] : [];
      setNauczyciele(nList.map((n: { id: string; imie?: string; nazwisko?: string; przedmioty?: { id: string; nazwa?: string }[] }) => ({
        id: String(n.id),
        imie: n.imie ?? '',
        nazwisko: n.nazwisko ?? '',
        przedmioty: Array.isArray(n.przedmioty) ? n.przedmioty : [],
      })));
    }).catch(() => {
      setNauczycieleError(true);
    }).finally(() => setNauczycieleLoading(false));
  }, [trybPrzydziel, modalRow]);

  const przedmiotIdDlaNazwy = (nazwa: string): string | null => {
    const n = (nazwa || '').trim();
    const exact = przedmioty.find((p) => (p.nazwa || '').trim() === n);
    if (exact) return exact.id;
    const lower = n.toLowerCase();
    const fuzzy = przedmioty.find((p) => (p.nazwa || '').trim().toLowerCase() === lower);
    return fuzzy ? fuzzy.id : null;
  };

  const nauczycieleDlaPrzedmiotu = (przedmiotId: string | null) => {
    if (!przedmiotId) return [];
    return nauczyciele.filter((n) => n.przedmioty.some((p) => String(p.id) === przedmiotId));
  };

  const otworzModalPrzydziel = (row: WierszPrzedmiotu) => {
    setModalRow(row);
    const maxH = Math.min(10, Math.max(0, Math.floor(row.doPrzydzielenia) || 0));
    setModalGodziny(maxH > 0 ? Math.min(1, maxH) : 0);
    setModalNauczycielId('');
    setKomunikatPrzydziel(null);
  };

  const zamknijModalPrzydziel = () => {
    setModalRow(null);
    setModalNauczycielId('');
    setKomunikatPrzydziel(null);
  };

  const zapiszPrzydziel = async () => {
    if (!selectedClass?.id || !modalRow) return;
    const przedmiotId = przedmiotIdDlaNazwy(modalRow.nazwa);
    if (!przedmiotId) {
      setKomunikatPrzydziel({ typ: 'error', tekst: `Brak przedmiotu „${modalRow.nazwa}" w bazie. Dodaj go w Panelu admina → Przedmioty.` });
      return;
    }
    if (!modalNauczycielId) {
      setKomunikatPrzydziel({ typ: 'error', tekst: 'Wybierz nauczyciela.' });
      return;
    }
    const rokNorm = (selectedRocznik || '').replace(/-/g, '/');
    setZapisywanie(true);
    setKomunikatPrzydziel(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/dyspozycja/przydziel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klasaId: String(selectedClass.id),
          przedmiotId: String(przedmiotId),
          nauczycielId: String(modalNauczycielId),
          rokSzkolny: rokNorm,
          godzinyTyg: Number(modalGodziny),
          rok: selectedRok || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      let data: { error?: string; message?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } catch {
        // nie JSON (np. strona błędu)
      }
      if (!res.ok) {
        throw new Error(data.error || `Błąd zapisu (${res.status})`);
      }
      setKomunikatPrzydziel({ typ: 'success', tekst: data.message ?? 'Przydział zapisany.' });
      fetch(`/api/dyspozycja/przydziel?klasaId=${encodeURIComponent(selectedClass.id)}&rokSzkolny=${encodeURIComponent(rokNorm)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((d: { assigned?: Record<string, Record<string, number>> }) => {
          if (d.assigned && typeof d.assigned === 'object') setAssignedGodziny(d.assigned);
        })
        .catch(() => {});
      setTimeout(() => {
        zamknijModalPrzydziel();
      }, 1200);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setKomunikatPrzydziel({ typ: 'error', tekst: 'Upłynął limit czasu. Spróbuj ponownie.' });
      } else {
        setKomunikatPrzydziel({ typ: 'error', tekst: e instanceof Error ? e.message : 'Błąd zapisu' });
      }
    } finally {
      setZapisywanie(false);
    }
  };

  const kolumny: Column<WierszPrzedmiotu>[] = [
    {
      key: 'przedmiot',
      header: 'Przedmiot',
      render: (row) => <span className="text-ink">{row.nazwa}</span>,
    },
    {
      key: 'godziny',
      header: 'Godz./tyg',
      align: 'right',
      className: 'tabular-nums w-24',
      render: (row) => <span className="text-ink-soft">{row.godziny}</span>,
    },
    {
      key: 'doPrzydzielenia',
      header: 'Do przydzielenia',
      align: 'right',
      className: 'w-44',
      render: (row) => (
        <KomorkaDoPrzydzielenia
          row={row}
          klikalny={trybPrzydziel}
          onActivate={() => otworzModalPrzydziel(row)}
        />
      ),
    },
  ];

  const sumaGodzin = przedmiotyDlaRoku.reduce((s, r) => s + r.godziny, 0);

  const pobierzTypySzkol = async () => {
    setLadowanieTypow(true);
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      const mapped = list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' }));
      setTypySzkol(mapped);
      const zap = getZapamietanyTypSzkoly();
      if (zap && mapped.some((t: { id: string }) => t.id === zap)) setTypSzkolyId(zap);
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    } finally {
      setLadowanieTypow(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Dyspozycja"
        actions={
          <Link href="/dashboard" className={buttonClass('secondary')}>
            ← Dashboard
          </Link>
        }
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">Wybierz szkołę, rok i klasę</h2>
        <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-end gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="min-w-0 sm:w-[220px]">
            <Field label="Typ szkoły" htmlFor="dysp-typ">
              <Select
                id="dysp-typ"
                value={typSzkolyId}
                onChange={(e) => {
                  const v = e.target.value;
                  zapiszTypSzkoly(v);
                  setTypSzkolyId(v);
                }}
                disabled={ladowanieTypow}
              >
                <option value="">{ladowanieTypow ? 'Ładowanie…' : 'wybierz typ szkoły'}</option>
                {typySzkol.map((typ) => (
                  <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-0 sm:w-[160px]">
            <Field label="Rok szkolny" htmlFor="dysp-rok">
              <Select
                id="dysp-rok"
                value={selectedRocznik}
                onChange={(e) => {
                  const v = e.target.value;
                  zapiszRocznik(v);
                  setSelectedRocznik(v);
                  setSelectedLitera('');
                }}
                disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
              >
                <option value="">{ladowanieKlas ? 'Ładowanie…' : 'rocznik'}</option>
                {roczniki.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-0 sm:w-[120px]">
            <Field label="Klasa" htmlFor="dysp-klasa">
              <Select
                id="dysp-klasa"
                value={selectedLitera}
                onChange={(e) => {
                  const v = e.target.value;
                  zapiszLitera(v);
                  setSelectedLitera(v);
                }}
                disabled={!selectedRocznik || literki.length === 0}
              >
                <option value="">klasa</option>
                {literki.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </Field>
          </div>
          {selectedClass && selectedRok && (
            <div className="min-w-0">
              <label className="block text-sm font-medium text-ink-soft mb-1">Rok (w cyklu)</label>
              <div className="rounded-sm border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
                {selectedRok} <span className="text-ink-faint text-xs">(na podstawie aktualnej daty)</span>
              </div>
            </div>
          )}
        </div>
        {bladKlas && (
          <p className="mt-4 text-sm text-danger" role="alert">
            Nie udało się pobrać klas: {bladKlas}
          </p>
        )}
        {selectedClass && (
          <p className="mt-4 text-sm text-ink-soft">
            Wybrana klasa: <strong className="text-ink">{selectedClass.nazwa}</strong> ({selectedRocznik})
          </p>
        )}
      </Card>

      {selectedClass && selectedRok && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="mb-1 text-sm font-semibold text-ink">
                Przedmioty i godziny — rok {selectedRok}
              </h2>
              <p className="text-sm text-ink-faint">
                Dane z przydziału dla wybranej klasy (baza + godz. do wyboru + dyrektorskie + rozszerzenia/doradztwo).
              </p>
            </div>
            <Button
              type="button"
              variant="toggle"
              active={trybPrzydziel}
              onClick={() => setTrybPrzydziel((v) => !v)}
            >
              {trybPrzydziel ? 'Anuluj wybór kafelka' : 'Przydziel nauczyciela'}
            </Button>
          </div>
          {trybPrzydziel && (
            <p className="text-sm text-accent mb-2" role="status" aria-live="polite">
              Wybierz komórkę w kolumnie „Do przydzielenia” (klik lub Enter/Spacja), aby przypisać nauczyciela.
            </p>
          )}
          <div className="max-w-2xl">
            <DataTable
              columns={kolumny}
              rows={przedmiotyDlaRoku}
              getRowKey={(row) => row.nazwa}
              loading={ladowaniePrzydzial}
              error={bladPrzydzial}
              empty="Brak przedmiotów do wyświetlenia dla tego roku."
              footer={
                <>
                  <td className="px-3 py-2.5 text-ink">Suma</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">{sumaGodzin}</td>
                  <td className="px-3 py-2.5 text-right text-ink-faint">godz./tyg</td>
                </>
              }
            />
          </div>
        </Card>
      )}

      {/* Modal przydzielenia nauczyciela */}
      {modalRow &&
        (() => {
          const przId = przedmiotIdDlaNazwy(modalRow.nazwa);
          const dostepni = nauczycieleDlaPrzedmiotu(przId);
          const maxGodziny = Math.min(10, Math.max(0.5, Math.floor(modalRow.doPrzydzielenia * 2) / 2 || 0.5));
          return (
            <PrzydzielModal
              nazwaPrzedmiotu={modalRow.nazwa}
              godziny={modalGodziny}
              maxGodziny={maxGodziny}
              doPrzydzielenia={modalRow.doPrzydzielenia}
              onGodzinyChange={setModalGodziny}
              nauczycielId={modalNauczycielId}
              onNauczycielChange={setModalNauczycielId}
              dostepniNauczyciele={dostepni}
              nauczycieleLoading={nauczycieleLoading}
              nauczycieleError={nauczycieleError}
              brakDopasowanych={!!przId && dostepni.length === 0}
              komunikat={komunikatPrzydziel}
              zapisywanie={zapisywanie}
              onSave={zapiszPrzydziel}
              onClose={zamknijModalPrzydziel}
            />
          );
        })()}
    </div>
  );
}
