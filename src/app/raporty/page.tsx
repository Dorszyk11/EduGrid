'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Icon, { type IconName } from '@/components/ui/Icon';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

/** Zakres lat szkolnych do wyboru — generowany wokół bieżącego roku (bez zmiany domeny). */
function lataSzkolne(): string[] {
  const teraz = new Date().getFullYear();
  const lata: string[] = [];
  for (let start = teraz + 1; start >= teraz - 5; start--) {
    lata.push(`${start}/${start + 1}`);
  }
  return lata;
}

const ROK_DOMYSLNY = '2024/2025';

const RAPORTY: { typ: string; icon: IconName; tytul: string; opis: string; renderowalny: boolean }[] = [
  {
    typ: 'zgodnosc-mein',
    icon: 'success',
    tytul: 'Raport zgodności MEiN',
    opis: 'Szczegółowy raport zgodności planowanych godzin z wymaganiami MEiN dla każdej klasy i przedmiotu.',
    renderowalny: true,
  },
  {
    typ: 'obciazenia',
    icon: 'chart',
    tytul: 'Raport obciążeń nauczycieli',
    opis: 'Analiza obciążeń godzinowych nauczycieli, wykrywanie przeciążeń i niedociążeń.',
    renderowalny: true,
  },
  {
    typ: 'braki-kadrowe',
    icon: 'warning',
    tytul: 'Raport braków kadrowych',
    opis: 'Lista przedmiotów i klas bez przypisanych nauczycieli z sugerowanymi rozwiązaniami.',
    renderowalny: true,
  },
  {
    // Brak renderera widoku — raport dostępny wyłącznie jako eksport XLS, nie jako ekran.
    typ: 'arkusz-organizacyjny',
    icon: 'file',
    tytul: 'Arkusz organizacyjny',
    opis: 'Pełny arkusz organizacyjny szkoły z możliwością eksportu do XLS.',
    renderowalny: false,
  },
];

export default function RaportyPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>(ROK_DOMYSLNY);
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [bladTypow, setBladTypow] = useState<string | null>(null);

  useEffect(() => {
    let aktywne = true;
    (async () => {
      setLadowanieTypow(true);
      setBladTypow(null);
      try {
        const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
        if (!response.ok) throw new Error('Nie udało się pobrać typów szkół.');
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        if (!aktywne) return;
        setTypySzkol(
          list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })),
        );
      } catch (error) {
        if (!aktywne) return;
        setBladTypow(error instanceof Error ? error.message : 'Nieznany błąd przy pobieraniu typów szkół.');
        setTypySzkol([]);
      } finally {
        if (aktywne) setLadowanieTypow(false);
      }
    })();
    return () => {
      aktywne = false;
    };
  }, []);

  const lata = lataSzkolne();
  // Bieżąca wartość mogłaby nie znaleźć się w wygenerowanym zakresie — dołącz ją, by Select był spójny.
  const opcjeLat = lata.includes(rokSzkolny) ? lata : [rokSzkolny, ...lata];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Raporty"
        actions={
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <Icon name="back" size={16} />
            Dashboard
          </Button>
        }
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Parametry raportu</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Typ szkoły"
            htmlFor="typ-szkoly"
            required
            error={bladTypow ?? undefined}
            hint={
              !bladTypow && !ladowanieTypow && typySzkol.length === 0
                ? 'Brak zdefiniowanych typów szkół — dodaj je w panelu administratora.'
                : undefined
            }
          >
            <Select
              id="typ-szkoly"
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              disabled={ladowanieTypow || !!bladTypow}
              invalid={!!bladTypow}
              aria-describedby={bladTypow ? 'typ-szkoly-error' : undefined}
            >
              <option value="">{ladowanieTypow ? 'Wczytywanie…' : 'Wybierz typ szkoły'}</option>
              {typySzkol.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazwa}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Rok szkolny" htmlFor="rok-szkolny">
            <Select id="rok-szkolny" value={rokSzkolny} onChange={(e) => setRokSzkolny(e.target.value)}>
              {opcjeLat.map((rok) => (
                <option key={rok} value={rok}>
                  {rok}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RAPORTY.map((r) => {
          const wPrzygotowaniu = !r.renderowalny;
          const niedostepny = !typSzkolyId || wPrzygotowaniu;
          const podpis = wPrzygotowaniu
            ? 'Raport w przygotowaniu'
            : !typSzkolyId
              ? 'Wybierz typ szkoły, aby otworzyć'
              : undefined;

          const ikona = (
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-card bg-accent-weak text-accent">
              <Icon name={r.icon} size={20} />
            </span>
          );
          const tytul = <h3 className="mb-1 font-semibold text-ink">{r.tytul}</h3>;
          const opis = <p className="text-sm text-ink-soft">{r.opis}</p>;

          // Kafelek niedostępny: NIE jest linkiem (nie w tab-order jako klikalny),
          // poprawnie oznaczony aria-disabled; podpis tłumaczy powód.
          if (niedostepny) {
            return (
              <div
                key={r.typ}
                aria-disabled="true"
                className="block rounded-card border border-line bg-surface p-5 opacity-60"
              >
                {ikona}
                {tytul}
                {opis}
                {podpis && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <Icon name={wPrzygotowaniu ? 'info' : 'warning'} size={14} />
                    {podpis}
                  </p>
                )}
              </div>
            );
          }

          return (
            <Link
              key={r.typ}
              href={`/raporty/${r.typ}?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`}
              className="block rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop focus-visible:outline-2 focus-visible:outline-accent"
            >
              {ikona}
              {tytul}
              {opis}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
