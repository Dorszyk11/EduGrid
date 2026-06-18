'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import StatusPill from '@/components/ui/StatusPill';
import Icon from '@/components/ui/Icon';

/** Lista lat szkolnych do wyboru: bieżący rok ± kilka, z gwarancją obecności aktualnie wybranej wartości. */
function lataSzkolne(wybrany: string): string[] {
  const teraz = new Date();
  const bazowy = teraz.getMonth() >= 7 ? teraz.getFullYear() : teraz.getFullYear() - 1;
  const lata: string[] = [];
  for (let r = bazowy + 1; r >= bazowy - 4; r -= 1) {
    lata.push(`${r}/${r + 1}`);
  }
  if (!lata.includes(wybrany)) lata.push(wybrany);
  return lata;
}

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface Klasa {
  id: string;
  nazwa: string;
  profil: string | null;
}

interface Przedmiot {
  id: string;
  nazwa: string;
}

interface MacierzKlasa {
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  nauczycielId?: string;
  nauczycielNazwa?: string;
  liczbaNauczycieli: number;
}

interface MacierzWiersz {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasy: MacierzKlasa[];
  sumaGodzinTygodniowo: number;
  sumaGodzinRocznie: number;
}

interface SiatkaSzkolyData {
  typSzkolyId: string;
  rokSzkolny: string;
  klasy: Klasa[];
  przedmioty: Przedmiot[];
  macierz: MacierzWiersz[];
}

export default function SiatkaSzkolyPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>('2024/2025');
  const [dane, setDane] = useState<SiatkaSzkolyData | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pokazTylkoZPrzypisaniami, setPokazTylkoZPrzypisaniami] = useState(false);

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      pobierzSiatke();
    } else {
      setDane(null);
    }
  }, [typSzkolyId, rokSzkolny]);

  const pobierzTypySzkol = async () => {
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })));
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    }
  };

  const pobierzSiatke = async () => {
    if (!typSzkolyId) return;

    setLadowanie(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/siatka-szkoly?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd przy pobieraniu danych');
      }

      const data = await response.json();
      setDane(data);
    } catch (error) {
      console.error('Błąd:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  const przefiltrowanaMacierz = pokazTylkoZPrzypisaniami
    ? dane?.macierz.filter(w => w.sumaGodzinTygodniowo > 0) || []
    : dane?.macierz || [];

  const lata = useMemo(() => lataSzkolne(rokSzkolny), [rokSzkolny]);

  const opis = dane
    ? `${przefiltrowanaMacierz.length} przedmiotów, ${dane.klasy.length} klas · rok szkolny ${dane.rokSzkolny}`
    : 'Przegląd przydzielonych godzin według przedmiotów i oddziałów.';

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Siatka godzin szkoły"
        description={opis}
        actions={
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <Icon name="back" size={16} />
            Dashboard
          </Button>
        }
      />

      {/* Formularz filtrowania */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Typ szkoły" htmlFor="typ-szkoly" required>
            <Select
              id="typ-szkoly"
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </Select>
          </Field>

          <Field label="Rok szkolny" htmlFor="rok-szkolny">
            <Select
              id="rok-szkolny"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
            >
              {lata.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center pt-7">
            <label htmlFor="pokazTylkoZPrzypisaniami" className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                id="pokazTylkoZPrzypisaniami"
                checked={pokazTylkoZPrzypisaniami}
                onChange={(e) => setPokazTylkoZPrzypisaniami(e.target.checked)}
                className="rounded-sm border-line-strong text-accent focus:ring-accent"
              />
              Pokaż tylko przedmioty z przypisaniami
            </label>
          </div>
        </div>
      </Card>

      {/* Komunikat błędu */}
      {error && (
        <div role="status" aria-live="polite" className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-sm">
          {error}
        </div>
      )}

      {/* Tabela siatki */}
      {ladowanie ? (
        <Card padding="none">
          <div className="overflow-x-auto" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Wczytywanie siatki godzin…</span>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <span className="block h-3.5 w-20 animate-pulse motion-reduce:animate-none rounded-sm bg-line" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, r) => (
                  <tr key={r} className="border-b border-line last:border-0">
                    {Array.from({ length: 5 }).map((_, c) => (
                      <td key={c} className="px-4 py-3">
                        <span className="block h-3.5 w-3/4 animate-pulse motion-reduce:animate-none rounded-sm bg-line" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : dane && dane.macierz.length > 0 ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase sticky left-0 bg-surface-2 z-10">
                    Przedmiot
                  </th>
                  {dane.klasy.map(klasa => (
                    <th
                      key={klasa.id}
                      className="px-3 py-2 text-center text-xs font-medium text-ink-soft"
                      title={klasa.profil || undefined}
                    >
                      <div>{klasa.nazwa}</div>
                      {klasa.profil && (
                        <div className="text-xs text-ink-faint font-normal">{klasa.profil}</div>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-ink-soft border-l-2 border-line-strong">
                    Suma
                  </th>
                </tr>
              </thead>
              <tbody>
                {przefiltrowanaMacierz.map((wiersz) => (
                  <tr key={wiersz.przedmiotId} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3 text-sm font-medium sticky left-0 bg-surface z-10">
                      <Link
                        href={`/przedmioty/${wiersz.przedmiotId}`}
                        className="text-accent hover:text-accent-strong hover:underline"
                      >
                        {wiersz.przedmiotNazwa}
                      </Link>
                    </td>
                    {wiersz.klasy.map((klasa) => (
                      <td
                        key={klasa.klasaId}
                        className={`px-3 py-2 text-center text-sm ${
                          klasa.godzinyTygodniowo === 0 ? 'text-ink-faint' : 'text-ink'
                        }`}
                      >
                        {klasa.godzinyTygodniowo > 0 ? (
                          <div>
                            <div className="font-medium tabular-nums">{klasa.godzinyTygodniowo}h/tyg</div>
                            <div className="text-xs text-ink-faint tabular-nums">{klasa.godzinyRoczne}h/rok</div>
                            {klasa.nauczycielNazwa && (
                              <div className="text-xs text-accent mt-1">
                                {klasa.nauczycielNazwa}
                                {klasa.liczbaNauczycieli > 1 && (
                                  <span className="text-ink-faint tabular-nums"> +{klasa.liczbaNauczycieli - 1}</span>
                                )}
                              </div>
                            )}
                            {klasa.liczbaNauczycieli === 0 && (
                              <div className="mt-1 flex justify-center">
                                <StatusPill status="BRAK" label="Brak nauczyciela" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-ink-faint">
                            <Icon name="close" size={12} />
                            <span className="text-xs">brak godzin</span>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm font-medium border-l-2 border-line-strong">
                      <div className="tabular-nums">{wiersz.sumaGodzinTygodniowo}h/tyg</div>
                      <div className="text-xs text-ink-faint tabular-nums">{wiersz.sumaGodzinRocznie}h/rok</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 font-semibold border-t border-line-strong">
                  <td className="px-4 py-3 text-sm sticky left-0 bg-surface-2 z-10">Suma</td>
                  {dane.klasy.map(klasa => {
                    const suma = przefiltrowanaMacierz.reduce(
                      (sum, w) => sum + (w.klasy.find(k => k.klasaId === klasa.id)?.godzinyTygodniowo || 0),
                      0
                    );
                    return (
                      <td key={klasa.id} className="px-3 py-2 text-center text-sm tabular-nums">
                        {suma}h/tyg
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm tabular-nums border-l-2 border-line-strong">
                    {przefiltrowanaMacierz.reduce((sum, w) => sum + w.sumaGodzinTygodniowo, 0)}h/tyg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : dane && dane.macierz.length === 0 ? (
        <Card className="text-center text-ink-faint">
          Brak danych do wyświetlenia. Upewnij się, że wybrano typ szkoły i że istnieją przypisania godzin.
        </Card>
      ) : null}
    </div>
  );
}
