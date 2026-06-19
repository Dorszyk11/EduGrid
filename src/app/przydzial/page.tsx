'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import PlanMeinTabela, { type PulaPlanu } from '@/components/dashboard/PlanMeinTabela';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly, getZapamietanyRocznik, zapiszRocznik, getZapamietanaLitera, zapiszLitera } from '@/utils/typSzkolyStorage';
import PageHeader from '@/components/ui/PageHeader';
import Button, { buttonClass } from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Icon, { type IconName } from '@/components/ui/Icon';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';
import { statusRealizacji, type TonStatusu } from '@/lib/status-realizacji';

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

const PULA_TON_BG: Record<TonStatusu, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  accent: 'bg-accent-weak text-accent-strong',
};

/** Jedna metryka puli: etykieta + przydzielone/pula, ton z `statusRealizacji` (przekroczenie = nadwyżka). */
function PulaMetryka({ etykieta, przydzielone, pula }: { etykieta: string; przydzielone: number; pula: number }) {
  const s = statusRealizacji(przydzielone, pula);
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{etykieta}</span>
      <span
        className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-sm px-2 py-0.5 text-sm font-semibold tabular-nums ${PULA_TON_BG[s.ton]}`}
        aria-label={`${etykieta}: przydzielono ${przydzielone} z ${pula}, ${s.opis}`}
      >
        <span>{przydzielone} / {pula}</span>
        <span aria-hidden className="opacity-50">·</span>
        <span aria-hidden>{s.znak}</span>
      </span>
    </div>
  );
}

/** Sticky pasek nad tabelą: pula godzin do wyboru / dyrektorskich / rozszerzeń z policzonych już danych planu. */
function WidzetPuli({ pula }: { pula: PulaPlanu[] }) {
  if (pula.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 border-b border-line bg-surface/95 px-4 sm:px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
    >
      <div className="flex flex-col gap-3">
        {pula.map((p) => (
          <div key={p.planId} className="flex flex-wrap items-end gap-x-6 gap-y-2">
            {pula.length > 1 && p.cycleLabel && (
              <span className="text-xs font-semibold text-ink-soft self-center">{p.cycleLabel}</span>
            )}
            <PulaMetryka etykieta="Do wyboru" przydzielone={p.doWyboru.przydzielone} pula={p.doWyboru.pula} />
            {p.dyrektorskie.pula > 0 && (
              <PulaMetryka etykieta="Dyrektorskie" przydzielone={p.dyrektorskie.przydzielone} pula={p.dyrektorskie.pula} />
            )}
            {p.rozszerzenia && (
              <PulaMetryka etykieta="Rozszerzenia" przydzielone={p.rozszerzenia.przydzielone} pula={p.rozszerzenia.pula} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrzydzialPage() {
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [bladKlas, setBladKlas] = useState<string | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [resetowanie, setResetowanie] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [pula, setPula] = useState<PulaPlanu[]>([]);
  const [trybPrzydzielGodzine, setTrybPrzydzielGodzine] = useState(false);
  const [trybPrzydzielDyrektor, setTrybPrzydzielDyrektor] = useState(false);
  const [trybUsunGodzine, setTrybUsunGodzine] = useState(false);
  const [trybDodajRozszerzenia, setTrybDodajRozszerzenia] = useState(false);
  const [trybPrzydzielGodzinyRozszerzen, setTrybPrzydzielGodzinyRozszerzen] = useState(false);
  const [trybPodzielNaGrupy, setTrybPodzielNaGrupy] = useState(false);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const roczniki = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
  const literki = selectedRocznik
    ? [...new Set(klasaList.filter((k) => k.rok_szkolny === selectedRocznik).map((k) => k.nazwa))].filter(Boolean).sort()
    : [];
  const selectedClass = klasaList.find(
    (k) => k.rok_szkolny === selectedRocznik && k.nazwa === selectedLitera
  );
  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  /** Tylko szkoła branżowa i technikum mają „Przydziel godzinę” (godziny do wyboru). */
  const maGodzinyDoWyboru = /branżowa|technikum/i.test(nazwaTypuSzkoly);
  /** Liceum i Technikum mają przedmioty w zakresie rozszerzonym (pula godzin rozszerzeń). */
  const maRozszerzenia = /liceum|technikum/i.test(nazwaTypuSzkoly);
  /** Szkoła podstawowa 1–3 nie ma przycisku „Generuj przydział”. */
  const ukryjGenerujPrzydzial = /podstawowa/i.test(nazwaTypuSzkoly) && /1-3|1–3|1—3/.test(nazwaTypuSzkoly);

  /** Aktywny tryb edycji → instrukcja „gdzie kliknąć”. Nazwy kolorów zgodne z podświetleniem komórek w tabeli. */
  const aktywnyTryb: { ikona: IconName; tytul: string; opis: string } | null =
    trybPrzydzielGodzine
      ? { ikona: 'plus', tytul: 'Przydzielanie godzin do wyboru', opis: 'Kliknij podświetlone komórki, aby dodać godzinę: zielone — wolne godziny do wyboru, niebieskie — ponad limit (po potwierdzeniu). Prawy przycisk myszy usuwa.' }
      : trybPrzydzielDyrektor
        ? { ikona: 'plus', tytul: 'Godziny dyrektorskie', opis: 'Kliknij podświetlone (niebieskie) komórki, aby dodać godzinę dyrektorską. Prawy przycisk myszy usuwa.' }
        : trybDodajRozszerzenia
          ? { ikona: 'plus', tytul: 'Oznaczanie rozszerzeń', opis: 'Kliknij podświetloną (niebieską) nazwę przedmiotu, aby oznaczyć go jako rozszerzenie (i z powrotem).' }
          : trybPrzydzielGodzinyRozszerzen
            ? { ikona: 'plus', tytul: 'Godziny rozszerzeń', opis: 'Kliknij podświetlone (niebieskie) komórki przedmiotów rozszerzonych, aby dodać godzinę. Prawy przycisk myszy usuwa.' }
            : trybPodzielNaGrupy
              ? { ikona: 'info', tytul: 'Podział na grupy', opis: 'Kliknij podświetlone (żółte) komórki, aby podzielić rocznik na grupy 1 i 2 albo scalić je z powrotem.' }
              : null;

  /** Wyłącza wszystkie tryby poza tym wskazanym (toggle jak dotąd). */
  const przelaczTryb = (setter: Dispatch<SetStateAction<boolean>>) => {
    setTrybPrzydzielGodzine(false);
    setTrybPrzydzielDyrektor(false);
    setTrybUsunGodzine(false);
    setTrybDodajRozszerzenia(false);
    setTrybPrzydzielGodzinyRozszerzen(false);
    setTrybPodzielNaGrupy(false);
    setter((v) => !v);
  };

  const pobierzTypySzkol = useCallback(async () => {
    setLadowanieTypow(true);
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      const mapped = list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' }));
      setTypySzkol(mapped);
      const zap = getZapamietanyTypSzkoly();
      if (zap && mapped.some((t: { id: string }) => t.id === zap)) setTypSzkolyId(zap);
    } catch (error) {
      toast.error(error instanceof Error ? `Nie udało się pobrać typów szkół: ${error.message}` : 'Nie udało się pobrać typów szkół');
    } finally {
      setLadowanieTypow(false);
    }
  }, [toast]);

  useEffect(() => {
    pobierzTypySzkol();
  }, [pobierzTypySzkol]);

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
        .catch((e) => {
          setBladKlas(e instanceof Error ? e.message : 'Błąd pobierania klas');
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

  /** Przydziela godziny do wyboru do przedmiotów po kolei (po latach) i zapisuje do bazy. */
  const generujPrzydzial = async () => {
    if (!typSzkolyId) {
      toast.error('Wybierz typ szkoły');
      return;
    }
    if (!selectedClass?.id) {
      toast.error('Wybierz klasę (rocznik i literę)');
      return;
    }

    setLadowanie(true);

    try {
      const klasaId = String(selectedClass.id);
      const typId = String(typSzkolyId);
      const url = `/api/przydzial/generuj?klasaId=${encodeURIComponent(klasaId)}&typSzkolyId=${encodeURIComponent(typId)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klasaId, typSzkolyId: typId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd przy generowaniu przydziału');
      }

      toast.success(data.komunikat ?? 'Przydzielono godziny do wyboru do przedmiotów (po latach po kolei).');
      setRefetchTrigger((t) => t + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  /** Pyta o potwierdzenie (danger) i resetuje przydział godzin dla wybranej klasy. */
  const resetujPrzydzial = async () => {
    if (!selectedClass?.id) {
      toast.error('Wybierz klasę (rocznik i literę)');
      return;
    }
    const ok = await confirm({
      title: 'Zresetować przydział?',
      description:
        'Zresetować przydział godzin dla tej klasy? Zostaną wyzerowane: godziny do wyboru, zajęcia z zakresu doradztwa zawodowego, godziny dyrektorskie, rozszerzenia, godziny rozszerzeń oraz podziały na grupy.',
      confirmLabel: 'Zresetuj',
      tone: 'danger',
    });
    if (!ok) return;

    setResetowanie(true);
    try {
      const response = await fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klasaId: selectedClass.id,
          przydzial: {},
          doradztwo: {},
          dyrektor: {},
          rozszerzenia: [],
          rozszerzeniaGodziny: {},
          rozszerzeniaPrzydzial: {},
          podzialNaGrupy: {},
          przydzialGrupy: {},
          dyrektorGrupy: {},
          rozszerzeniaGrupy: {},
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Błąd przy resetowaniu');
      }

      toast.success('Przydział godzin dla tej klasy został zresetowany.');
      setRefetchTrigger((t) => t + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setResetowanie(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Przydział"
        actions={
          <>
            <Link href="/plany-mein" className={buttonClass('secondary')}>
              Zobacz plany MEiN
            </Link>
            {!ukryjGenerujPrzydzial && (
              <Button
                onClick={generujPrzydzial}
                disabled={ladowanie || resetowanie || !typSzkolyId || !selectedClass?.id}
              >
                {ladowanie ? 'Generowanie…' : 'Generuj przydział'}
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger-bg hover:text-danger"
              onClick={resetujPrzydzial}
              disabled={ladowanie || resetowanie || !selectedClass?.id}
            >
              {resetowanie ? 'Resetowanie…' : 'Reset'}
            </Button>
          </>
        }
      />

      {selectedClass?.id && (
        <div className="flex flex-wrap items-center gap-2">
          {maGodzinyDoWyboru && (
            <Button
              type="button"
              variant="toggle"
              active={trybPrzydzielGodzine}
              onClick={() => przelaczTryb(setTrybPrzydzielGodzine)}
            >
              Przydziel godzinę
            </Button>
          )}
          <Button
            type="button"
            variant="toggle"
            active={trybPrzydzielDyrektor}
            onClick={() => przelaczTryb(setTrybPrzydzielDyrektor)}
          >
            Godz. dyrektorskie
          </Button>
          {maRozszerzenia && (
            <>
              <span className="hidden sm:inline text-ink-faint text-sm" aria-hidden>|</span>
              <Button
                type="button"
                variant="toggle"
                active={trybDodajRozszerzenia}
                onClick={() => przelaczTryb(setTrybDodajRozszerzenia)}
              >
                Dodaj rozszerzenia
              </Button>
              <Button
                type="button"
                variant="toggle"
                active={trybPrzydzielGodzinyRozszerzen}
                onClick={() => przelaczTryb(setTrybPrzydzielGodzinyRozszerzen)}
              >
                Przydziel godziny rozszerzeń
              </Button>
            </>
          )}
          <span className="hidden sm:inline text-ink-faint text-sm" aria-hidden>|</span>
          <Button
            type="button"
            variant="toggle"
            active={trybPodzielNaGrupy}
            onClick={() => przelaczTryb(setTrybPodzielNaGrupy)}
          >
            Podziel na grupy (1 i 2)
          </Button>
        </div>
      )}

      {selectedClass?.id && aktywnyTryb && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-card border border-accent/30 bg-accent-weak px-3.5 py-2.5"
        >
          <Icon name={aktywnyTryb.ikona} size={18} className="mt-0.5 shrink-0 text-accent-strong" />
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-accent-strong">Tryb: {aktywnyTryb.tytul}.</span>{' '}
            {aktywnyTryb.opis}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="w-full sm:w-[200px]">
          <Field label="Typ szkoły" htmlFor="przydzial-typ-szkoly">
            <Select
              id="przydzial-typ-szkoly"
              value={typSzkolyId}
              onChange={(e) => {
                const v = e.target.value;
                zapiszTypSzkoly(v);
                setTypSzkolyId(v);
              }}
              disabled={ladowanieTypow}
            >
              <option value="">{ladowanieTypow ? 'Ładowanie…' : 'Wybierz typ szkoły'}</option>
              {typySzkol.map((typ) => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-full sm:w-[140px]">
          <Field label="Rocznik" htmlFor="przydzial-rocznik" error={bladKlas ?? undefined}>
            <Select
              id="przydzial-rocznik"
              value={selectedRocznik}
              onChange={(e) => {
                const v = e.target.value;
                zapiszRocznik(v);
                setSelectedRocznik(v);
                setSelectedLitera('');
              }}
              disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
            >
              <option value="">{ladowanieKlas ? 'Ładowanie…' : 'Rocznik'}</option>
              {roczniki.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-full sm:w-[100px]">
          <Field label="Klasa" htmlFor="przydzial-litera">
            <Select
              id="przydzial-litera"
              value={selectedLitera}
              onChange={(e) => {
                const v = e.target.value;
                zapiszLitera(v);
                setSelectedLitera(v);
              }}
              disabled={!selectedRocznik || literki.length === 0}
            >
              <option value="">Klasa</option>
              {literki.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </Field>
        </div>
        {selectedClass && (
          <span className="text-sm text-ink-soft sm:whitespace-nowrap sm:pb-2">
            Wybrana klasa: <strong>{selectedClass.nazwa}</strong> ({selectedRocznik})
          </span>
        )}
      </div>

      {nazwaTypuSzkoly && (
        <div className="space-y-2 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-ink">Plan ramowy MEiN – godziny do wyboru i dyrektorskie</h2>
          <p className="text-ink-soft text-sm leading-relaxed">
            Wybierz typ szkoły i klasę. Przycisk „Generuj przydział” przydziela godziny do wyboru do przedmiotów po kolei (po latach: I, II, III… lub IV, V, VI…). Możesz też ręcznie dodawać/usuwać godziny w tabeli.
          </p>
          {selectedClass?.id && <WidzetPuli pula={pula} />}
          <PlanMeinTabela
            nazwaTypuSzkoly={nazwaTypuSzkoly}
            klasaId={selectedClass?.id}
            refetchTrigger={refetchTrigger}
            trybPrzydzielGodzine={trybPrzydzielGodzine}
            trybPrzydzielDyrektor={trybPrzydzielDyrektor}
            trybUsunGodzine={trybUsunGodzine}
            trybDodajRozszerzenia={trybDodajRozszerzenia}
            trybPrzydzielGodzinyRozszerzen={trybPrzydzielGodzinyRozszerzen}
            trybPodzielNaGrupy={trybPodzielNaGrupy}
            onPulaChange={setPula}
          />
        </div>
      )}
      {dialog}
    </div>
  );
}
