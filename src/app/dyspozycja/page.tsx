'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import plansData from '@/utils/import/ramowe-plany.json';

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

function getGradesFromPlan(plan: PlanItem): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

/** Klucz jak w PlanMeinTabela – używany w przydziale. */
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

/** Nie pokazywać w tabeli dyspozycji. */
function pominWyswietlanie(subjectName: string): boolean {
  const s = (subjectName || '').trim().toLowerCase();
  return s.includes('doradztwa zawodowego') || /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/.test(s);
}

function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a) return false;
  if (a === b) return true;
  if (b === 'szkoła podstawowa' && a.startsWith('szkoła podstawowa')) return true;
  return false;
}

function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  return undefined;
}

function isSubjectRow(row: SubjectRow): row is SubjectRow & { subject: string } {
  return 'subject' in row && typeof (row as { subject?: string }).subject === 'string';
}

export default function DyspozycjaPage() {
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [selectedRok, setSelectedRok] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [przydzialData, setPrzydzialData] = useState<{
    przydzial: Record<string, Record<string, number>>;
    dyrektor: Record<string, Record<string, number>>;
    doradztwo: Record<string, Record<string, number>>;
    rozszerzenia: string[];
    rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
  } | null>(null);
  const [ladowaniePrzydzial, setLadowaniePrzydzial] = useState(false);
  const [trybPrzydziel, setTrybPrzydziel] = useState(false);
  const [modalRow, setModalRow] = useState<{ nazwa: string; godziny: number; doPrzydzielenia: number } | null>(null);
  const [modalGodziny, setModalGodziny] = useState(1);
  const [modalNauczycielId, setModalNauczycielId] = useState('');
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikatPrzydziel, setKomunikatPrzydziel] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);
  const [przedmioty, setPrzedmioty] = useState<{ id: string; nazwa: string }[]>([]);
  const [nauczyciele, setNauczyciele] = useState<{ id: string; imie: string; nazwisko: string; przedmioty: { id: string; nazwa?: string }[] }[]>([]);
  const [nauczycieleLoading, setNauczycieleLoading] = useState(false);
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

  /** Godziny na dany rok = baza z planu + przydział + dyrektor; doPrzydzielenia = godziny minus już przypisane. */
  const przedmiotyDlaRoku =
    plan && selectedRok
      ? (() => {
          const przedmiotIdDlaNazwyNow = (nazwa: string): string | null => {
            const n = (nazwa || '').trim();
            const exact = przedmioty.find((p) => (p.nazwa || '').trim() === n);
            if (exact) return exact.id;
            const lower = n.toLowerCase();
            const fuzzy = przedmioty.find((p) => (p.nazwa || '').trim().toLowerCase() === lower);
            return fuzzy ? fuzzy.id : null;
          };
          return plan.subjects
            .filter(isSubjectRow)
            .filter((row) => !pominWyswietlanie(row.subject ?? ''))
            .map((row) => {
              const nazwa = row.subject ?? '—';
              const subKey = subjectKey(plan.plan_id, nazwa);
              const base = row.hours_by_grade?.[selectedRok] ?? 0;
              const p = przydzialData?.przydzial?.[subKey]?.[selectedRok] ?? 0;
              const d = przydzialData?.dyrektor?.[subKey]?.[selectedRok] ?? 0;
              let godziny: number;
              if (isPrzedmiotLaczny(nazwa)) {
                godziny = przydzialData?.doradztwo?.[subKey]?.[selectedRok] ?? 0;
              } else if (isPrzedmiotRozszerzony(nazwa)) {
                const planPrefix = (plan.plan_id ?? 'plan') + '_';
                godziny = (przydzialData?.rozszerzenia ?? [])
                  .filter((k) => k.startsWith(planPrefix))
                  .reduce((s, k) => s + (przydzialData?.rozszerzeniaPrzydzial?.[k]?.[selectedRok] ?? 0), 0);
              } else {
                const rozsz = przydzialData?.rozszerzenia?.includes(subKey) ? (przydzialData?.rozszerzeniaPrzydzial?.[subKey]?.[selectedRok] ?? 0) : 0;
                godziny = base + p + d + rozsz;
              }
              const pid = przedmiotIdDlaNazwyNow(nazwa);
              const przypisane = pid ? (assignedGodziny?.[pid]?.[selectedRok] ?? 0) : 0;
              const doPrzydzielenia = Math.max(0, godziny - przypisane);
              return { nazwa, godziny, doPrzydzielenia };
            });
        })()
      : [];

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      setLadowanieKlas(true);
      setSelectedRocznik('');
      setSelectedLitera('');
      setSelectedRok('');
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
      setSelectedRok('');
    }
  }, [typSzkolyId]);

  useEffect(() => {
    if (!rokiPlanu.includes(selectedRok)) setSelectedRok('');
  }, [rokiPlanu, selectedRok]);

  useEffect(() => {
    if (!selectedClass?.id) {
      setPrzydzialData(null);
      setAssignedGodziny(null);
      return;
    }
    setLadowaniePrzydzial(true);
    Promise.all([
      fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(selectedClass.id)}`, { cache: 'no-store' }).then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed')))),
      fetch('/api/przedmioty', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([data, przedmiotyRes]) => {
        setPrzydzialData({
          przydzial: (data as any).przydzial && typeof (data as any).przydzial === 'object' ? (data as any).przydzial : {},
          dyrektor: (data as any).dyrektor && typeof (data as any).dyrektor === 'object' ? (data as any).dyrektor : {},
          doradztwo: (data as any).doradztwo && typeof (data as any).doradztwo === 'object' ? (data as any).doradztwo : {},
          rozszerzenia: Array.isArray((data as any).rozszerzenia) ? (data as any).rozszerzenia : [],
          rozszerzeniaPrzydzial: (data as any).rozszerzeniaPrzydzial && typeof (data as any).rozszerzeniaPrzydzial === 'object' ? (data as any).rozszerzeniaPrzydzial : {},
        });
        const pList = Array.isArray(przedmiotyRes) ? przedmiotyRes : (przedmiotyRes as any)?.przedmioty ?? [];
        setPrzedmioty(pList.map((p: { id: string; nazwa?: string }) => ({ id: String(p.id), nazwa: p.nazwa ?? '' })));
      })
      .catch(() => setPrzydzialData(null))
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
    Promise.all([
      fetch('/api/przedmioty', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/nauczyciele', { cache: 'no-store' }).then((r) => r.json()),
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
    }).catch(() => {}).finally(() => setNauczycieleLoading(false));
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

  const otworzModalPrzydziel = (row: { nazwa: string; godziny: number; doPrzydzielenia: number }) => {
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

  const pobierzTypySzkol = async () => {
    setLadowanieTypow(true);
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })));
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    } finally {
      setLadowanieTypow(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dyspozycja</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded inline-flex items-center justify-center w-fit"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Wybierz szkołę, rok i klasę</h2>
        <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-gray-600">Typ szkoły</label>
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              disabled={ladowanieTypow}
              className="w-full sm:w-[220px] border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
            >
              <option value="">{ladowanieTypow ? 'Ładowanie...' : '— wybierz typ szkoły —'}</option>
              {typySzkol.map((typ) => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-gray-600">Rok szkolny</label>
            <select
              value={selectedRocznik}
              onChange={(e) => {
                setSelectedRocznik(e.target.value);
                setSelectedLitera('');
              }}
              disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
              className="w-full sm:w-[160px] border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
            >
              <option value="">{ladowanieKlas ? 'Ładowanie...' : '— rocznik —'}</option>
              {roczniki.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-sm font-medium text-gray-600">Klasa</label>
            <select
              value={selectedLitera}
              onChange={(e) => setSelectedLitera(e.target.value)}
              disabled={!selectedRocznik || literki.length === 0}
              className="w-full sm:w-[120px] border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
            >
              <option value="">— klasa —</option>
              {literki.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          {typSzkolyId && (
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-sm font-medium text-gray-600">Rok (klasa w cyklu)</label>
              <select
                value={selectedRok}
                onChange={(e) => setSelectedRok(e.target.value)}
                disabled={rokiPlanu.length === 0}
                className="w-full sm:w-[100px] border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
              >
                <option value="">
                  {rokiPlanu.length === 0 ? '— brak planu dla typu —' : '— rok —'}
                </option>
                {rokiPlanu.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {selectedClass && (
          <p className="mt-4 text-sm text-gray-600">
            Wybrana klasa: <strong>{selectedClass.nazwa}</strong> ({selectedRocznik})
            {selectedClass.id && (
              <span className="text-gray-400 ml-2">· id: {selectedClass.id}</span>
            )}
          </p>
        )}
      </div>

      {selectedRok && przedmiotyDlaRoku.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Przedmioty i godziny — rok {selectedRok}
              </h2>
              <p className="text-sm text-gray-500">
                Dane z przydziału dla wybranej klasy (baza + godz. do wyboru + dyrektorskie + rozszerzenia/doradztwo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTrybPrzydziel((v) => !v)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${trybPrzydziel ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {trybPrzydziel ? 'Anuluj wybór kafelka' : 'Przydziel nauczyciela'}
            </button>
          </div>
          {trybPrzydziel && (
            <p className="text-sm text-blue-600 mb-2">Kliknij kafelek w kolumnie „Do przydzielenia”, aby przypisać nauczyciela.</p>
          )}
          {ladowaniePrzydzial && (
            <p className="text-sm text-amber-600 mb-2">Ładowanie przydziału…</p>
          )}
          <div className="overflow-x-auto max-w-2xl">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Przedmiot
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Godz./tyg
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Do przydzielenia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {przedmiotyDlaRoku.map((row, index) => {
                  const doPrz = row.doPrzydzielenia;
                  const bgClass =
                    doPrz === 0
                      ? 'bg-green-100 text-green-900'
                      : doPrz === 1
                        ? 'bg-yellow-100 text-yellow-900'
                        : doPrz >= 2
                          ? 'bg-red-100 text-red-900'
                          : 'bg-gray-50 text-gray-700';
                  const klikalny = trybPrzydziel;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{row.nazwa}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{row.godziny}</td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${bgClass} ${klikalny ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 ring-offset-1' : ''}`}
                        role={klikalny ? 'button' : undefined}
                        onClick={klikalny ? () => otworzModalPrzydziel(row) : undefined}
                      >
                        {row.doPrzydzielenia}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Suma: {przedmiotyDlaRoku.reduce((s, r) => s + r.godziny, 0)} godz./tyg
          </p>
        </div>
      )}

      {/* Modal przydzielenia nauczyciela */}
      {modalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Przydziel nauczyciela</h3>
            <p className="text-sm text-gray-600">
              Przedmiot: <strong>{modalRow.nazwa}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ilość godzin (tyg.)</label>
              <input
                type="range"
                min={0.5}
                max={Math.min(10, Math.max(0.5, Math.floor(modalRow.doPrzydzielenia * 2) / 2 || 0.5))}
                step={0.5}
                value={modalGodziny}
                onChange={(e) => setModalGodziny(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="inline-block mt-1 text-sm font-medium text-gray-800">{modalGodziny}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nauczyciel (ze specjalizacją)</label>
              <select
                value={modalNauczycielId}
                onChange={(e) => setModalNauczycielId(e.target.value)}
                disabled={nauczycieleLoading}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">{nauczycieleLoading ? 'Ładowanie...' : '— wybierz nauczyciela —'}</option>
                {!nauczycieleLoading && nauczycieleDlaPrzedmiotu(przedmiotIdDlaNazwy(modalRow.nazwa)).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.imie} {n.nazwisko}
                  </option>
                ))}
              </select>
              {przedmiotIdDlaNazwy(modalRow.nazwa) && nauczycieleDlaPrzedmiotu(przedmiotIdDlaNazwy(modalRow.nazwa)).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Brak nauczycieli ze specjalizacją do tego przedmiotu.</p>
              )}
            </div>
            {komunikatPrzydziel && (
              <div className={`p-2 rounded text-sm ${komunikatPrzydziel.typ === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {komunikatPrzydziel.tekst}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={zamknijModalPrzydziel}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={zapiszPrzydziel}
                disabled={zapisywanie || !modalNauczycielId || modalGodziny <= 0}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {zapisywanie ? 'Zapisywanie…' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
