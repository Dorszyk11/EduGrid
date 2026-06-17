'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { RaportZgodnoscMein, RaportObciazenia, RaportBrakiKadrowe } from '@/types/api';

type TypRaportu = 'zgodnosc-mein' | 'obciazenia' | 'braki-kadrowe' | 'arkusz-organizacyjny';
type RaportData = RaportZgodnoscMein | RaportObciazenia | RaportBrakiKadrowe;

const TYTUL: Record<TypRaportu, string> = {
  'zgodnosc-mein': 'Raport zgodności MEiN',
  obciazenia: 'Raport obciążeń nauczycieli',
  'braki-kadrowe': 'Raport braków kadrowych',
  'arkusz-organizacyjny': 'Arkusz organizacyjny',
};

const TH = 'px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wide';
const TD = 'px-6 py-4 whitespace-nowrap text-sm';

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'danger' | 'warn';
}) {
  const color =
    tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function RaportZgodnosci({ data }: { data: RaportZgodnoscMein }) {
  const s = data.statystyki;
  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Statystyki</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Łącznie" value={s.lacznie} />
          <Stat label="Zgodne" value={s.zgodne} tone="ok" />
          <Stat label="Z brakami" value={s.zBrakami} tone="danger" />
          <Stat label="Z nadwyżkami" value={s.zNadwyzkami} tone="warn" />
          <Stat label="Średni % realizacji" value={`${s.sredniProcent.toFixed(1)}%`} />
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className={TH}>Przedmiot</th>
                <th className={TH}>Klasa</th>
                <th className={`${TH} text-center`}>Wymagane</th>
                <th className={`${TH} text-center`}>Planowane</th>
                <th className={`${TH} text-center`}>Różnica</th>
                <th className={`${TH} text-center`}>Realizacja</th>
                <th className={`${TH} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.wyniki.map((w, index) => (
                <tr key={index} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className={TD}>
                    <Link href={`/przedmioty/${w.przedmiot.id}`} className="text-accent hover:underline">
                      {w.przedmiot.nazwa}
                    </Link>
                  </td>
                  <td className={TD}>
                    <Link href={`/klasy/${w.klasa.id}`} className="text-accent hover:underline">
                      {w.klasa.nazwa}
                    </Link>
                  </td>
                  <td className={`${TD} text-center tabular-nums`}>{w.wymagane.godziny_w_cyklu}</td>
                  <td className={`${TD} text-center tabular-nums`}>{w.planowane.godziny_w_cyklu}</td>
                  <td
                    className={`${TD} text-center font-medium tabular-nums ${
                      w.roznica.roznica < 0 ? 'text-danger' : w.roznica.roznica > 0 ? 'text-ok' : 'text-ink-soft'
                    }`}
                  >
                    {w.roznica.roznica > 0 ? '+' : ''}
                    {w.roznica.roznica}
                  </td>
                  <td className={`${TD} text-center tabular-nums`}>{w.roznica.procent_realizacji.toFixed(1)}%</td>
                  <td className={`${TD} text-center`}>
                    <StatusPill status={w.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function RaportObciazen({ data }: { data: RaportObciazenia }) {
  const s = data.statystyki;
  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Statystyki</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Łącznie" value={s.lacznie} />
          <Stat label="Przekroczone" value={s.przekroczone} tone="danger" />
          <Stat label="Pełne" value={s.pelne} tone="ok" />
          <Stat label="Niskie" value={s.niskie} tone="warn" />
          <Stat label="Średnie obciążenie" value={`${s.srednieObciazenie.toFixed(1)}h`} />
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className={TH}>Nauczyciel</th>
                <th className={`${TH} text-center`}>Obciążenie</th>
                <th className={`${TH} text-center`}>Max</th>
                <th className={`${TH} text-center`}>Wykorzystanie</th>
                <th className={`${TH} text-center`}>Przypisania</th>
                <th className={`${TH} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.obciazenia.map((obc) => {
                const status =
                  obc.aktualneObciazenie > obc.maxObciazenie
                    ? { label: 'Przekroczone', key: 'PRZECIĄŻENIE' }
                    : obc.procentWykorzystania >= 90
                      ? { label: 'Pełne', key: 'OK' }
                      : obc.procentWykorzystania < 50
                        ? { label: 'Niskie', key: 'NIEDOCIĄŻENIE' }
                        : { label: 'W normie', key: 'NEUTRAL' };
                return (
                  <tr key={obc.nauczycielId} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className={TD}>
                      <Link
                        href={`/nauczyciele/${obc.nauczycielId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {obc.nauczycielNazwa}
                      </Link>
                    </td>
                    <td className={`${TD} text-center font-medium tabular-nums`}>{obc.aktualneObciazenie}h</td>
                    <td className={`${TD} text-center tabular-nums`}>{obc.maxObciazenie}h</td>
                    <td className={`${TD} text-center tabular-nums`}>{obc.procentWykorzystania.toFixed(1)}%</td>
                    <td className={`${TD} text-center tabular-nums`}>{obc.liczbaPrzypisan || 0}</td>
                    <td className={`${TD} text-center`}>
                      <StatusPill status={status.key} label={status.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function RaportBraki({ data }: { data: RaportBrakiKadrowe }) {
  const s = data.statystyki;
  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Statystyki</h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Łącznie braków" value={s.lacznie} tone="danger" />
          <Stat label="Łączne godziny" value={`${s.laczneGodziny}h`} />
          <Stat label="Wymagane etaty" value={s.wymaganeEtaty} />
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className={TH}>Przedmiot</th>
                <th className={TH}>Klasa</th>
                <th className={`${TH} text-center`}>Godziny/tyg</th>
                <th className={TH}>Powód</th>
                <th className={`${TH} text-center`}>Dostępni</th>
                <th className={TH}>Sugestie</th>
              </tr>
            </thead>
            <tbody>
              {data.braki.map((brak, index) => (
                <tr key={index} className="border-b border-line last:border-0 hover:bg-danger-bg">
                  <td className={TD}>
                    <Link
                      href={`/przedmioty/${brak.przedmiotId}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {brak.przedmiotNazwa}
                    </Link>
                  </td>
                  <td className={TD}>
                    <Link href={`/klasy/${brak.klasaId}`} className="text-accent hover:underline">
                      {brak.klasaNazwa}
                    </Link>
                  </td>
                  <td className={`${TD} text-center font-medium tabular-nums`}>{brak.godzinyTygodniowo}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{brak.powod}</td>
                  <td className={`${TD} text-center tabular-nums`}>{brak.dostepniNauczyciele}</td>
                  <td className="px-6 py-4 text-sm">
                    <ul className="list-inside list-disc text-ink-soft">
                      {brak.sugerowaneRozwiazania?.slice(0, 2).map((sugestia, i) => (
                        <li key={i} className="text-xs">
                          {sugestia}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function RaportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const typSzkolyId = searchParams.get('typSzkolyId') || '';
  const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

  const [typ, setTyp] = useState<TypRaportu | null>(null);
  const [dane, setDane] = useState<RaportData | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const typZUrl = pathname?.split('/').pop() as TypRaportu;
    if (typZUrl && ['zgodnosc-mein', 'obciazenia', 'braki-kadrowe', 'arkusz-organizacyjny'].includes(typZUrl)) {
      setTyp(typZUrl);
      if (typSzkolyId) {
        pobierzRaport(typZUrl);
      } else {
        setLadowanie(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, typSzkolyId, rokSzkolny]);

  const pobierzRaport = async (typRaportu: TypRaportu) => {
    if (!typSzkolyId && typRaportu !== 'obciazenia') {
      setError('Wybierz typ szkoły');
      setLadowanie(false);
      return;
    }

    setLadowanie(true);
    setError(null);

    try {
      let url = '';
      switch (typRaportu) {
        case 'zgodnosc-mein':
          url = `/api/dashboard/zgodnosc-mein?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`;
          break;
        case 'obciazenia':
          url = `/api/dashboard/obciazenie-nauczycieli?rokSzkolny=${rokSzkolny}`;
          break;
        case 'braki-kadrowe':
          url = `/api/dashboard/braki-kadrowe?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`;
          break;
        default:
          setError('Nieznany typ raportu');
          return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd przy pobieraniu raportu');
      }
      setDane((await response.json()) as RaportData);
    } catch (e) {
      console.error('Błąd:', e);
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  const eksportujDoXLS = async () => {
    if (!typSzkolyId) return;
    const url = `/api/export/xls?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}&typ=${
      typ === 'zgodnosc-mein' ? 'zgodnosc-mein' : 'arkusz-organizacyjny'
    }`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Błąd przy eksporcie');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Raport_${typ}_${rokSzkolny.replace('/', '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('Błąd eksportu:', e);
      toast.error('Błąd przy eksporcie do XLS');
    }
  };

  if (ladowanie) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-line" />
            <div className="h-4 w-1/2 rounded bg-line" />
            <div className="h-4 w-2/3 rounded bg-line" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div>
        <Button variant="secondary" onClick={() => router.push('/raporty')}>
          <Icon name="back" size={16} />
          Powrót do raportów
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={typ ? TYTUL[typ] : 'Raport'}
        actions={
          <>
            <Button variant="secondary" onClick={eksportujDoXLS}>
              <Icon name="download" size={16} />
              Eksportuj do XLS
            </Button>
            <Button variant="ghost" onClick={() => router.push('/raporty')}>
              <Icon name="back" size={16} />
              Powrót
            </Button>
          </>
        }
      />

      {typ === 'zgodnosc-mein' && dane && <RaportZgodnosci data={dane as RaportZgodnoscMein} />}
      {typ === 'obciazenia' && dane && <RaportObciazen data={dane as RaportObciazenia} />}
      {typ === 'braki-kadrowe' && dane && <RaportBraki data={dane as RaportBrakiKadrowe} />}
    </div>
  );
}
