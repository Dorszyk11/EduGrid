'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { buttonClass } from '@/components/ui/Button';

interface NauczycielListItem {
  id: string | number;
  imie: string;
  nazwisko: string;
  przedmioty: Array<{ id: string | number; nazwa?: string | null }>;
}

interface ObciazenieItem {
  id?: string | number;
  klasa: { id: string | number; nazwa: string };
  przedmiot: { id: string | number; nazwa: string };
  godziny_tyg: number;
  godziny_roczne: number;
  rok_szkolny: string;
  /** Rok w cyklu (I, II, III itd.) */
  rok?: string;
}

interface NauczycielDetail {
  nauczyciel: {
    id: string | number;
    imie: string;
    nazwisko: string;
    email?: string;
    telefon?: string;
    etat?: string;
    max_obciazenie?: number;
  };
  obciazenie: ObciazenieItem[];
  podsumowanie?: {
    suma_godzin_tyg: number;
    suma_godzin_rocznie: number;
    max_obciazenie: number;
    roznica: number;
    procent_obciazenia: number;
    status: string;
    liczba_klas: number;
    liczba_przedmiotow: number;
  };
  kwalifikacje?: Array<{
    przedmiot: { id: string | number; nazwa: string };
    stopien?: string;
    specjalizacja?: string;
  }>;
}

const SELECT_CLASS =
  'w-full max-w-md border border-line-strong rounded-sm px-3 py-2 text-sm bg-surface text-ink disabled:opacity-60';

/** Unikalna para klasa + rok (do wyboru w select) */
function uniqueKlasyRok(obciazenie: ObciazenieItem[]): { klasaId: string; klasaNazwa: string; rokSzkolny: string }[] {
  const seen = new Set<string>();
  const out: { klasaId: string; klasaNazwa: string; rokSzkolny: string }[] = [];
  for (const o of obciazenie) {
    const key = `${o.klasa.id}-${o.rok_szkolny}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      klasaId: String(o.klasa.id),
      klasaNazwa: o.klasa.nazwa,
      rokSzkolny: o.rok_szkolny || '',
    });
  }
  out.sort((a, b) => {
    const cmpKlasa = a.klasaNazwa.localeCompare(b.klasaNazwa);
    if (cmpKlasa !== 0) return cmpKlasa;
    return a.rokSzkolny.localeCompare(b.rokSzkolny);
  });
  return out;
}

export default function NauczycielePage() {
  const [nauczyciele, setNauczyciele] = useState<NauczycielListItem[]>([]);
  const [wybranyNauczycielId, setWybranyNauczycielId] = useState<string>('');
  const [wybranaKlasaRok, setWybranaKlasaRok] = useState<string>('');
  const [daneNauczyciela, setDaneNauczyciela] = useState<NauczycielDetail | null>(null);
  const [ladowanieListy, setLadowanieListy] = useState(true);
  const [ladowanieSzczegoly, setLadowanieSzczegoly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuwanieId, setUsuwanieId] = useState<string | number | null>(null);

  useEffect(() => {
    fetch('/api/nauczyciele', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNauczyciele(data);
        else setNauczyciele([]);
      })
      .catch(() => setNauczyciele([]))
      .finally(() => setLadowanieListy(false));
  }, []);

  useEffect(() => {
    if (!wybranyNauczycielId) {
      setDaneNauczyciela(null);
      setWybranaKlasaRok('');
      return;
    }
    setLadowanieSzczegoly(true);
    setError(null);
    setWybranaKlasaRok('');
    fetch(`/api/nauczyciele/${wybranyNauczycielId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDaneNauczyciela(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Błąd pobierania');
        setDaneNauczyciela(null);
      })
      .finally(() => setLadowanieSzczegoly(false));
  }, [wybranyNauczycielId]);

  const opcjeKlasyRok = daneNauczyciela ? uniqueKlasyRok(daneNauczyciela.obciazenie) : [];
  const [klasaIdSel, rokSzkolnySel] = wybranaKlasaRok ? wybranaKlasaRok.split('::') : [null, null];

  const usunPrzypisanie = async (rozkładId: string | number) => {
    if (!wybranyNauczycielId) return;
    setUsuwanieId(rozkładId);
    setError(null);
    try {
      const res = await fetch(`/api/nauczyciele/obciazenie/${rozkładId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Błąd usuwania');
      const next = await fetch(`/api/nauczyciele/${wybranyNauczycielId}`).then((r) => r.json());
      if (next.error) throw new Error(next.error);
      setDaneNauczyciela(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setUsuwanieId(null);
    }
  };

  const obciazenieFiltrowane =
    daneNauczyciela && klasaIdSel && rokSzkolnySel
      ? daneNauczyciela.obciazenie.filter(
          (o) => String(o.klasa.id) === klasaIdSel && (o.rok_szkolny || '') === rokSzkolnySel
        )
      : daneNauczyciela?.obciazenie ?? [];

  const sumaGodzinTyg = obciazenieFiltrowane.reduce((s, o) => s + o.godziny_tyg, 0);
  const liczbaKlas = new Set(obciazenieFiltrowane.map((o) => o.klasa.id)).size;
  const liczbaPrzedmiotow = new Set(obciazenieFiltrowane.map((o) => o.przedmiot.id)).size;

  const kolumny: Column<ObciazenieItem>[] = [
    {
      key: 'klasa',
      header: 'Klasa',
      render: (o) => (
        <Link href={`/klasy/${o.klasa.id}`} className="font-medium text-accent hover:text-accent-strong">
          {o.klasa.nazwa}
        </Link>
      ),
    },
    {
      key: 'przedmiot',
      header: 'Przedmiot',
      render: (o) => (
        <Link href={`/przedmioty/${o.przedmiot.id}`} className="text-accent hover:text-accent-strong">
          {o.przedmiot.nazwa}
        </Link>
      ),
    },
    { key: 'rok', header: 'Rok', align: 'center', render: (o) => (o.rok ? o.rok : '—') },
    { key: 'godz', header: 'Godz./tyg', align: 'center', render: (o) => o.godziny_tyg },
    {
      key: 'akcje',
      header: '',
      align: 'right',
      className: 'w-24',
      render: (o) =>
        o.id != null ? (
          <button
            type="button"
            onClick={() => usunPrzypisanie(o.id!)}
            disabled={usuwanieId === o.id}
            className="text-sm font-medium text-danger hover:opacity-80 disabled:opacity-50"
          >
            {usuwanieId === o.id ? '…' : 'Usuń'}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Nauczyciele"
        description="Obciążenie i kwalifikacje wybranego nauczyciela."
        actions={
          <Link href="/dashboard" className={buttonClass('secondary')}>
            ← Dashboard
          </Link>
        }
      />

      <Card className="space-y-4">
        <h2 className="font-display text-base font-semibold text-ink">Wybierz nauczyciela, klasę i rok</h2>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1" htmlFor="sel-nauczyciel">Nauczyciel</label>
          <select
            id="sel-nauczyciel"
            value={wybranyNauczycielId}
            onChange={(e) => setWybranyNauczycielId(e.target.value)}
            className={SELECT_CLASS}
            disabled={ladowanieListy}
          >
            <option value="">— wybierz nauczyciela —</option>
            {nauczyciele.map((n) => (
              <option key={String(n.id)} value={String(n.id)}>
                {n.imie} {n.nazwisko}
              </option>
            ))}
          </select>
        </div>

        {ladowanieSzczegoly && (
          <p className="text-sm text-ink-faint">Ładowanie obciążenia nauczyciela…</p>
        )}
        {error && (
          <div className="rounded-sm border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {daneNauczyciela && opcjeKlasyRok.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1" htmlFor="sel-klasa-rok">Klasa i rok szkolny</label>
            <select
              id="sel-klasa-rok"
              value={wybranaKlasaRok}
              onChange={(e) => setWybranaKlasaRok(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">— wybierz klasę i rok —</option>
              {opcjeKlasyRok.map((opt) => {
                const val = `${opt.klasaId}::${opt.rokSzkolny}`;
                return (
                  <option key={val} value={val}>
                    {opt.klasaNazwa} — {opt.rokSzkolny || 'brak roku'}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {daneNauczyciela && opcjeKlasyRok.length === 0 && daneNauczyciela.obciazenie.length === 0 && (
          <p className="rounded-sm bg-warn-bg p-3 text-sm text-warn">
            Ten nauczyciel nie ma przypisanych godzin w rozkładzie. Przydziel godziny w module Przydział.
          </p>
        )}
      </Card>

      {daneNauczyciela && (
        <div className="space-y-5">
          {/* Szczegóły nauczyciela */}
          <Card>
            <h2 className="font-display text-base font-semibold text-ink mb-3">Nauczyciel</h2>
            <p className="text-xl font-medium text-ink">
              {daneNauczyciela.nauczyciel.imie} {daneNauczyciela.nauczyciel.nazwisko}
            </p>
            {(daneNauczyciela.nauczyciel.email || daneNauczyciela.nauczyciel.telefon) && (
              <p className="text-ink-soft mt-1">
                {[daneNauczyciela.nauczyciel.email, daneNauczyciela.nauczyciel.telefon].filter(Boolean).join(' • ')}
              </p>
            )}
            {(daneNauczyciela.nauczyciel.etat != null || daneNauczyciela.nauczyciel.max_obciazenie != null) && (
              <p className="text-sm text-ink-faint mt-1 tabular">
                Etat: {daneNauczyciela.nauczyciel.etat ?? '—'} • Max obciążenie: {daneNauczyciela.nauczyciel.max_obciazenie ?? '—'}h/tyg
              </p>
            )}
          </Card>

          {/* Podsumowanie obciążenia (z API) */}
          {daneNauczyciela.podsumowanie && (
            <Card>
              <h2 className="font-display text-base font-semibold text-ink mb-4">Podsumowanie obciążenia</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-sm border border-line bg-surface-2 p-4">
                  <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
                  <p className="text-2xl font-bold text-ink tabular">{daneNauczyciela.podsumowanie.suma_godzin_tyg}</p>
                </div>
                <div className="rounded-sm border border-line bg-surface-2 p-4">
                  <p className="text-sm text-ink-soft">Procent obciążenia</p>
                  <p className="text-2xl font-bold text-ink tabular">{daneNauczyciela.podsumowanie.procent_obciazenia}%</p>
                </div>
                <div className="rounded-sm border border-line bg-surface-2 p-4">
                  <p className="text-sm text-ink-soft mb-1">Status</p>
                  <StatusPill status={daneNauczyciela.podsumowanie.status} />
                </div>
              </div>
              {daneNauczyciela.podsumowanie.roznica !== 0 && (
                <div className={`mt-4 rounded p-3 text-sm ${
                  daneNauczyciela.podsumowanie.roznica > 0 ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn'
                }`}>
                  <p className="font-semibold">
                    {daneNauczyciela.podsumowanie.roznica > 0 ? 'Przekroczono' : 'Niedociążenie'} o {Math.abs(daneNauczyciela.podsumowanie.roznica)} godz./tyg
                  </p>
                </div>
              )}
              <div className="mt-4 flex gap-6 text-sm text-ink-soft">
                <span>Liczba klas: <span className="font-semibold text-ink tabular">{daneNauczyciela.podsumowanie.liczba_klas}</span></span>
                <span>Liczba przedmiotów: <span className="font-semibold text-ink tabular">{daneNauczyciela.podsumowanie.liczba_przedmiotow}</span></span>
              </div>
            </Card>
          )}

          {/* Kwalifikacje */}
          {daneNauczyciela.kwalifikacje && daneNauczyciela.kwalifikacje.length > 0 && (
            <Card>
              <h2 className="font-display text-base font-semibold text-ink mb-4">Kwalifikacje</h2>
              <div className="space-y-2">
                {daneNauczyciela.kwalifikacje.map((kwal, index) => (
                  <div key={index} className="flex items-center justify-between rounded-sm border border-line bg-surface-2 p-3">
                    <div>
                      <p className="font-semibold text-ink">{kwal.przedmiot?.nazwa}</p>
                      {(kwal.specjalizacja || kwal.stopien) && (
                        <p className="text-sm text-ink-soft">{[kwal.specjalizacja, kwal.stopien].filter(Boolean).join(' • ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Przedmiot per klasa */}
          {obciazenieFiltrowane.length > 0 && (
            <Card padding="md">
              <h2 className="font-display text-base font-semibold text-ink mb-4">
                Przedmiot per klasa
                {wybranaKlasaRok && (
                  <span className="text-sm font-normal text-ink-faint ml-2">
                    — {opcjeKlasyRok.find((o) => `${o.klasaId}::${o.rokSzkolny}` === wybranaKlasaRok)?.klasaNazwa},{' '}
                    {rokSzkolnySel}
                  </span>
                )}
              </h2>
              <DataTable
                columns={kolumny}
                rows={obciazenieFiltrowane}
                getRowKey={(_, i) => i}
              />
            </Card>
          )}

          {/* Sumarycznie */}
          <Card>
            <h2 className="font-display text-base font-semibold text-ink mb-4">Sumarycznie</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-sm border border-line bg-surface-2 p-4">
                <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
                <p className="text-2xl font-bold text-ink tabular">{sumaGodzinTyg}</p>
              </div>
              <div className="rounded-sm border border-line bg-surface-2 p-4">
                <p className="text-sm text-ink-soft">Liczba klas</p>
                <p className="text-2xl font-bold text-ink tabular">{liczbaKlas}</p>
              </div>
              <div className="rounded-sm border border-line bg-surface-2 p-4">
                <p className="text-sm text-ink-soft">Liczba przedmiotów</p>
                <p className="text-2xl font-bold text-ink tabular">{liczbaPrzedmiotow}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
