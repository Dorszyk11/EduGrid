'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import plansData from '@/utils/import/ramowe-plany.json';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly, getZapamietanyRocznik, zapiszRocznik, getZapamietanaLitera, zapiszLitera } from '@/utils/typSzkolyStorage';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/Button';

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

type HoursByGrade = Record<string, number>;
type SubjectRow = { subject?: string; hours_by_grade?: HoursByGrade; director_discretion_hours?: unknown };
type PlanItem = { plan_id?: string; school_type: string; cycle: string; table_structure?: { grades?: string[] }; grades?: string[]; subjects: SubjectRow[] };
const allPlans: PlanItem[] = (plansData as { plans?: PlanItem[] }).plans ?? [];

const SELECT_CLASS = 'border border-line-strong rounded px-3 py-2 text-sm bg-surface text-ink disabled:opacity-60';

function getGradesFromPlan(plan: PlanItem): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];
function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

function pominWyswietlanie(subjectName: string): boolean {
  const s = (subjectName || '').trim().toLowerCase();
  return s.includes('doradztwa zawodowego') || /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/.test(s);
}

/** Dopasowanie nazwy typu (np. "Technikum, Klasy I–V") do school_type z planu. */
function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
  return false;
}

function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
  return undefined;
}

function isSubjectRow(row: SubjectRow): row is SubjectRow & { subject: string } {
  return 'subject' in row && typeof (row as { subject?: string }).subject === 'string';
}

/** Jedna linia planu: przedmiot + godziny w każdym roku. */
interface PlanRow {
  nazwa: string;
  godzinyByGrade: Record<string, number>;
}

export default function RealizacjaPage() {
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [przydzialData, setPrzydzialData] = useState<{
    przydzial: Record<string, Record<string, number>>;
    dyrektor: Record<string, Record<string, number>>;
    doradztwo: Record<string, Record<string, number>>;
    rozszerzenia: string[];
    rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
  } | null>(null);
  const [ladowaniePlanu, setLadowaniePlanu] = useState(false);
  /** Tryb „Dodaj realizację” — klik w komórkę dodaje zrealizowaną godzinę. */
  const [trybDodajRealizacje, setTrybDodajRealizacje] = useState(false);
  /** Zrealizowane godziny: [rowIndex][rok] = liczba. Ładowane z API, zapisywane przez „Zapisz”. */
  const [realizacjaGodziny, setRealizacjaGodziny] = useState<Record<string, Record<string, number>>>({});
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikatZapis, setKomunikatZapis] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);

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

  /** Plan rzeczywisty: wiersze = przedmioty, dla każdego roku (I, II, III...) godziny. Gdy brak przydziału – tylko godziny bazowe. */
  const danePrzydzialu = przydzialData ?? {
    przydzial: {},
    dyrektor: {},
    doradztwo: {},
    rozszerzenia: [],
    rozszerzeniaPrzydzial: {},
  };
  const planRzeczywisty: PlanRow[] =
    plan
      ? plan.subjects
          .filter(isSubjectRow)
          .filter((row) => !pominWyswietlanie(row.subject ?? ''))
          .map((row) => {
            const nazwa = row.subject ?? '—';
            const subKey = subjectKey(plan.plan_id, nazwa);
            const godzinyByGrade: Record<string, number> = {};
            for (const rok of rokiPlanu) {
              const base = row.hours_by_grade?.[rok] ?? 0;
              const p = danePrzydzialu.przydzial?.[subKey]?.[rok] ?? 0;
              const d = danePrzydzialu.dyrektor?.[subKey]?.[rok] ?? 0;
              let godziny: number;
              if (isPrzedmiotLaczny(nazwa)) {
                godziny = danePrzydzialu.doradztwo?.[subKey]?.[rok] ?? 0;
              } else if (isPrzedmiotRozszerzony(nazwa)) {
                const planPrefix = (plan.plan_id ?? 'plan') + '_';
                godziny = (danePrzydzialu.rozszerzenia ?? [])
                  .filter((k) => k.startsWith(planPrefix))
                  .reduce((s, k) => s + (danePrzydzialu.rozszerzeniaPrzydzial?.[k]?.[rok] ?? 0), 0);
              } else {
                const rozsz = danePrzydzialu.rozszerzenia?.includes(subKey) ? (danePrzydzialu.rozszerzeniaPrzydzial?.[subKey]?.[rok] ?? 0) : 0;
                godziny = base + p + d + rozsz;
              }
              godzinyByGrade[rok] = godziny;
            }
            return { nazwa, godzinyByGrade };
          })
      : [];

  useEffect(() => {
    let ok = true;
    const run = async () => {
      try {
        const res = await fetch('/api/typy-szkol', { cache: 'no-store' });
        const data = await res.json();
        if (!ok) return;
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        const mapped = list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' }));
        setTypySzkol(mapped);
        const zap = getZapamietanyTypSzkoly();
        if (zap && mapped.some((t: { id: string }) => t.id === zap)) setTypSzkolyId(zap);
      } catch {
        if (ok) setTypySzkol([]);
      } finally {
        if (ok) setLadowanieTypow(false);
      }
    };
    run();
    return () => { ok = false; };
  }, []);

  useEffect(() => {
    if (!typSzkolyId) {
      setKlasaList([]);
      setSelectedRocznik('');
      setSelectedLitera('');
      return;
    }
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
      setRealizacjaGodziny({});
      return;
    }
    setLadowaniePlanu(true);
    const nazwaTypu = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
    const cycleF = cycleFilterZNazwy(nazwaTypu);
    const planForFetch = allPlans.find(
      (p) => matchSchoolType(nazwaTypu, p.school_type) && (!cycleF || p.cycle === cycleF)
    );
    const roki = planForFetch ? getGradesFromPlan(planForFetch) : [];
    fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(selectedClass.id)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data) => {
        setPrzydzialData({
          przydzial: data.przydzial ?? {},
          dyrektor: data.dyrektor ?? {},
          doradztwo: data.doradztwo ?? {},
          rozszerzenia: Array.isArray(data.rozszerzenia) ? data.rozszerzenia : [],
          rozszerzeniaPrzydzial: data.rozszerzeniaPrzydzial && typeof data.rozszerzeniaPrzydzial === 'object' ? data.rozszerzeniaPrzydzial : {},
        });
        const realizacjaRaw = data.realizacja && typeof data.realizacja === 'object' ? data.realizacja : {};
        const built: Record<string, Record<string, number>> = {};
        if (planForFetch && roki.length > 0) {
          const rows = planForFetch.subjects.filter(isSubjectRow).filter((row) => !pominWyswietlanie(row.subject ?? ''));
          rows.forEach((row, index) => {
            const nazwa = row.subject ?? '—';
            const subKey = subjectKey(planForFetch.plan_id, nazwa);
            const byRok: Record<string, number> = {};
            roki.forEach((rok) => {
              byRok[rok] = realizacjaRaw[subKey]?.[rok] ?? 0;
            });
            built[String(index)] = byRok;
          });
        }
        setRealizacjaGodziny(built);
      })
      .catch(() => {
        setPrzydzialData(null);
        setRealizacjaGodziny({});
      })
      .finally(() => setLadowaniePlanu(false));
  }, [selectedClass?.id, typSzkolyId, typySzkol]);

  const dodajGodzineRealizacji = (rowIndex: number, rok: string) => {
    const key = String(rowIndex);
    const current = realizacjaGodziny[key]?.[rok] ?? 0;
    setRealizacjaGodziny((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [rok]: current + 1,
      },
    }));
  };

  const usunGodzineRealizacji = (rowIndex: number, rok: string) => {
    const key = String(rowIndex);
    const current = realizacjaGodziny[key]?.[rok] ?? 0;
    if (current <= 0) return;
    setRealizacjaGodziny((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [rok]: current - 1,
      },
    }));
  };

  const zapiszRealizacje = async () => {
    if (!selectedClass?.id || !plan) return;
    setZapisywanie(true);
    setKomunikatZapis(null);
    const payload: Record<string, Record<string, number>> = {};
    planRzeczywisty.forEach((row, index) => {
      const subKey = subjectKey(plan.plan_id, row.nazwa);
      const byRok = realizacjaGodziny[String(index)] ?? {};
      payload[subKey] = { ...byRok };
    });
    try {
      const res = await fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klasaId: selectedClass.id, realizacja: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu');
      setKomunikatZapis({ typ: 'success', tekst: 'Realizacja zapisana.' });
    } catch (e) {
      setKomunikatZapis({ typ: 'error', tekst: e instanceof Error ? e.message : 'Błąd zapisu' });
    } finally {
      setZapisywanie(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-full overflow-hidden">
      <PageHeader
        title="Realizacja"
        description="Zrealizowane godziny względem planu dla wybranej klasy."
        actions={
          <Link href="/dashboard" className={buttonClass('secondary')}>
            ← Dashboard
          </Link>
        }
      />

      <Card>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Wybierz klasę</h2>
        <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-ink-soft" htmlFor="r-typ">Typ szkoły</label>
            <select
              id="r-typ"
              value={typSzkolyId}
              onChange={(e) => {
                const v = e.target.value;
                zapiszTypSzkoly(v);
                setTypSzkolyId(v);
              }}
              disabled={ladowanieTypow}
              className={`w-full sm:w-[220px] ${SELECT_CLASS}`}
            >
              <option value="">{ladowanieTypow ? 'Ładowanie…' : '— wybierz typ szkoły —'}</option>
              {typySzkol.map((typ) => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-ink-soft" htmlFor="r-rocznik">Rok szkolny</label>
            <select
              id="r-rocznik"
              value={selectedRocznik}
              onChange={(e) => {
                const v = e.target.value;
                zapiszRocznik(v);
                setSelectedRocznik(v);
                setSelectedLitera('');
              }}
              disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
              className={`w-full sm:w-[160px] ${SELECT_CLASS}`}
            >
              <option value="">{ladowanieKlas ? 'Ładowanie…' : '— rocznik —'}</option>
              {roczniki.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-ink-soft" htmlFor="r-klasa">Klasa</label>
            <select
              id="r-klasa"
              value={selectedLitera}
              onChange={(e) => {
                const v = e.target.value;
                zapiszLitera(v);
                setSelectedLitera(v);
              }}
              disabled={!selectedRocznik || literki.length === 0}
              className={`w-full sm:w-[120px] ${SELECT_CLASS}`}
            >
              <option value="">— klasa —</option>
              {literki.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedClass && (
          <p className="mt-4 text-sm text-ink-soft">
            Wybrana klasa: <strong className="text-ink">{selectedClass.nazwa}</strong> ({selectedRocznik})
            {selectedClass.id && <span className="text-ink-faint ml-2 tabular">· id: {selectedClass.id}</span>}
          </p>
        )}
      </Card>

      {ladowaniePlanu && selectedClass && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
              <p className="mt-3 text-ink-soft">Ładowanie planu…</p>
            </div>
          </div>
        </Card>
      )}

      {!ladowaniePlanu && selectedClass && plan && rokiPlanu.length > 0 && planRzeczywisty.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Plan do realizacji — Klasa {selectedClass.nazwa} ({selectedRocznik})
              </h2>
              <p className="text-sm text-ink-soft mt-1">
                Domyślnie 0 — w nawiasie docelowa liczba godzin.
                {trybDodajRealizacje && ' Klik = dodaj godzinę, prawy przycisk = usuń realizację.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTrybDodajRealizacje((v) => !v)}
                className={trybDodajRealizacje
                  ? 'inline-flex items-center justify-center rounded px-3.5 py-2 text-sm font-medium bg-ok text-white hover:opacity-90 transition-colors'
                  : buttonClass('primary')}
              >
                {trybDodajRealizacje ? 'Zrealizowane (klikaj komórki)' : 'Dodaj realizację'}
              </button>
              <button
                type="button"
                onClick={zapiszRealizacje}
                disabled={zapisywanie}
                className={buttonClass('secondary')}
              >
                {zapisywanie ? 'Zapisywanie…' : 'Zapisz realizację'}
              </button>
            </div>
          </div>
          {komunikatZapis && (
            <div className={`mb-4 p-3 rounded text-sm ${komunikatZapis.typ === 'success' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'}`}>
              {komunikatZapis.tekst}
            </div>
          )}
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider border-b border-line">
                    Przedmiot
                  </th>
                  {rokiPlanu.map((rok) => (
                    <th key={rok} className="px-4 py-3 text-center text-xs font-medium text-ink-soft uppercase tracking-wider border-b border-l border-line">
                      {rok}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-ink-soft uppercase tracking-wider border-b border-l border-line">
                    Razem
                  </th>
                </tr>
              </thead>
              <tbody>
                {planRzeczywisty.map((row, index) => {
                  const sumaDocelowa = rokiPlanu.reduce((s, r) => s + (row.godzinyByGrade[r] ?? 0), 0);
                  const sumaZrealizowana = rokiPlanu.reduce((s, r) => s + (realizacjaGodziny[String(index)]?.[r] ?? 0), 0);
                  return (
                    <tr key={index} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 text-ink font-medium whitespace-nowrap border-r border-line">
                        {row.nazwa}
                      </td>
                      {rokiPlanu.map((rok) => {
                        const docelowe = row.godzinyByGrade[rok] ?? 0;
                        const zrealizowane = realizacjaGodziny[String(index)]?.[rok] ?? 0;
                        const brakuje = docelowe - zrealizowane;
                        const moznaDodac = trybDodajRealizacje;
                        const moznaUsunac = trybDodajRealizacje && zrealizowane > 0;
                        const klikalna = moznaDodac || moznaUsunac;
                        const kolorKomorki =
                          zrealizowane > docelowe
                            ? 'bg-accent-weak text-accent-strong'
                            : zrealizowane === docelowe
                              ? 'bg-ok-bg text-ok'
                              : brakuje === 1
                                ? 'bg-warn-bg text-warn'
                                : 'bg-danger-bg text-danger';
                        return (
                          <td
                            key={rok}
                            className={`px-4 py-3 text-center border-l border-line min-w-[4rem] tabular ${kolorKomorki} ${klikalna ? 'cursor-pointer hover:opacity-90' : ''}`}
                            role={klikalna ? 'button' : undefined}
                            onClick={moznaDodac ? () => dodajGodzineRealizacji(index, rok) : undefined}
                            onContextMenu={(e) => {
                              if (moznaUsunac) {
                                e.preventDefault();
                                usunGodzineRealizacji(index, rok);
                              }
                            }}
                          >
                            {zrealizowane} ({docelowe})
                          </td>
                        );
                      })}
                      {(() => {
                        const brakujeRazem = sumaDocelowa - sumaZrealizowana;
                        const kolorRazem =
                          sumaZrealizowana > sumaDocelowa
                            ? 'bg-accent-weak text-accent-strong font-medium'
                            : sumaZrealizowana === sumaDocelowa
                              ? 'bg-ok-bg text-ok font-medium'
                              : brakujeRazem === 1
                                ? 'bg-warn-bg text-warn font-medium'
                                : 'bg-danger-bg text-danger font-medium';
                        return (
                          <td className={`px-4 py-3 text-center font-medium border-l border-line tabular ${kolorRazem}`}>
                            {sumaZrealizowana} ({sumaDocelowa})
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!ladowaniePlanu && selectedClass && plan && rokiPlanu.length === 0 && (
        <div className="rounded-card border border-warn/30 bg-warn-bg p-4">
          <p className="text-warn">Brak planu MEiN dla wybranego typu szkoły. Sprawdź konfigurację ramowych planów.</p>
        </div>
      )}

      {!ladowaniePlanu && selectedClass && !plan && (
        <div className="rounded-card border border-warn/30 bg-warn-bg p-4">
          <p className="text-warn">Nie znaleziono planu dla typu „{nazwaTypuSzkoly}”.</p>
        </div>
      )}
    </div>
  );
}
