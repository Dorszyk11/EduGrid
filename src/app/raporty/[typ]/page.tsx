'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import DataTable, { type Column } from '@/components/ui/DataTable';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { statusObciazeniaRaport } from '@/lib/obciazenie';
import type { RaportZgodnoscMein, RaportObciazenia, RaportBrakiKadrowe } from '@/types/api';

type TypRaportu = 'zgodnosc-mein' | 'obciazenia' | 'braki-kadrowe' | 'arkusz-organizacyjny';
type RaportData = RaportZgodnoscMein | RaportObciazenia | RaportBrakiKadrowe;

const TYTUL: Record<TypRaportu, string> = {
  'zgodnosc-mein': 'Raport zgodności MEiN',
  obciazenia: 'Raport obciążeń nauczycieli',
  'braki-kadrowe': 'Raport braków kadrowych',
  'arkusz-organizacyjny': 'Arkusz organizacyjny',
};

/** Typy raportów posiadające widok ekranowy (renderer). `arkusz-organizacyjny` jest tylko eksportem XLS. */
const RENDEROWALNE: TypRaportu[] = ['zgodnosc-mein', 'obciazenia', 'braki-kadrowe'];

const TD_CELL = 'px-3 py-2.5';

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
  const sumaWymagane = data.wyniki.reduce((acc, w) => acc + w.wymagane.godziny_w_cyklu, 0);
  const sumaPlanowane = data.wyniki.reduce((acc, w) => acc + w.planowane.godziny_w_cyklu, 0);
  const sumaRoznica = data.wyniki.reduce((acc, w) => acc + w.roznica.roznica, 0);

  const columns: Column<RaportZgodnoscMein['wyniki'][number]>[] = [
    {
      key: 'przedmiot',
      header: 'Przedmiot',
      sticky: true,
      render: (w) => (
        <Link href={`/przedmioty/${w.przedmiot.id}`} className="text-accent hover:underline">
          {w.przedmiot.nazwa}
        </Link>
      ),
    },
    {
      key: 'klasa',
      header: 'Klasa',
      render: (w) => (
        <Link href={`/klasy/${w.klasa.id}`} className="text-accent hover:underline">
          {w.klasa.nazwa}
        </Link>
      ),
    },
    {
      key: 'wymagane',
      header: 'Wymagane',
      align: 'center',
      className: 'tabular-nums',
      render: (w) => w.wymagane.godziny_w_cyklu,
    },
    {
      key: 'planowane',
      header: 'Planowane',
      align: 'center',
      className: 'tabular-nums',
      render: (w) => w.planowane.godziny_w_cyklu,
    },
    {
      key: 'roznica',
      header: 'Różnica',
      align: 'center',
      render: (w) => (
        <span
          className={`font-medium tabular-nums ${
            w.roznica.roznica < 0 ? 'text-danger' : w.roznica.roznica > 0 ? 'text-ok' : 'text-ink-soft'
          }`}
        >
          {w.roznica.roznica > 0 ? '+' : ''}
          {w.roznica.roznica}
        </span>
      ),
    },
    {
      key: 'realizacja',
      header: 'Realizacja',
      align: 'center',
      className: 'tabular-nums',
      render: (w) => `${w.roznica.procent_realizacji.toFixed(1)}%`,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (w) => <StatusPill status={w.status} />,
    },
  ];

  return (
    <>
      {!data.kompletne && (
        <div
          role="status"
          className="rounded-card border border-warn bg-warn-bg px-4 py-3 text-sm text-warn"
        >
          {data.komunikat ?? 'Dane MEiN są niekompletne — wyniki mogą nie odzwierciedlać pełnej zgodności.'}
        </div>
      )}
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

      <DataTable
        columns={columns}
        rows={data.wyniki}
        getRowKey={(_w, index) => index}
        stickyHeader
        empty="Brak pozycji do oceny zgodności dla wybranych parametrów."
        footer={
          data.wyniki.length > 0 ? (
            <>
              <td className={`${TD_CELL} sticky left-0 z-10 bg-surface-2`}>Razem</td>
              <td className={TD_CELL} />
              <td className={`${TD_CELL} text-center tabular-nums`}>{sumaWymagane}</td>
              <td className={`${TD_CELL} text-center tabular-nums`}>{sumaPlanowane}</td>
              <td className={`${TD_CELL} text-center tabular-nums`}>
                {sumaRoznica > 0 ? '+' : ''}
                {sumaRoznica}
              </td>
              <td className={TD_CELL} />
              <td className={TD_CELL} />
            </>
          ) : undefined
        }
      />
    </>
  );
}

function RaportObciazen({ data }: { data: RaportObciazenia }) {
  const s = data.statystyki;
  const sumaObciazenie = data.obciazenia.reduce((acc, o) => acc + o.aktualneObciazenie, 0);
  const sumaPrzypisania = data.obciazenia.reduce((acc, o) => acc + (o.liczbaPrzypisan || 0), 0);

  const columns: Column<RaportObciazenia['obciazenia'][number]>[] = [
    {
      key: 'nauczyciel',
      header: 'Nauczyciel',
      sticky: true,
      render: (o) => (
        <Link href={`/nauczyciele/${o.nauczycielId}`} className="font-medium text-accent hover:underline">
          {o.nauczycielNazwa}
        </Link>
      ),
    },
    {
      key: 'obciazenie',
      header: 'Obciążenie',
      align: 'center',
      className: 'font-medium tabular-nums',
      render: (o) => `${o.aktualneObciazenie}h`,
    },
    {
      key: 'max',
      header: 'Max',
      align: 'center',
      className: 'tabular-nums',
      render: (o) => `${o.maxObciazenie}h`,
    },
    {
      key: 'wykorzystanie',
      header: 'Wykorzystanie',
      align: 'center',
      className: 'tabular-nums',
      render: (o) => `${o.procentWykorzystania.toFixed(1)}%`,
    },
    {
      key: 'przypisania',
      header: 'Przypisania',
      align: 'center',
      className: 'tabular-nums',
      render: (o) => o.liczbaPrzypisan || 0,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (o) => {
        const status = statusObciazeniaRaport(o.aktualneObciazenie, o.maxObciazenie, o.procentWykorzystania);
        return <StatusPill status={status.key} label={status.label} />;
      },
    },
  ];

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

      <DataTable
        columns={columns}
        rows={data.obciazenia}
        getRowKey={(o) => o.nauczycielId}
        stickyHeader
        empty="Brak nauczycieli do wykazania obciążenia."
        footer={
          data.obciazenia.length > 0 ? (
            <>
              <td className={`${TD_CELL} sticky left-0 z-10 bg-surface-2`}>Razem</td>
              <td className={`${TD_CELL} text-center tabular-nums`}>{sumaObciazenie}h</td>
              <td className={TD_CELL} />
              <td className={TD_CELL} />
              <td className={`${TD_CELL} text-center tabular-nums`}>{sumaPrzypisania}</td>
              <td className={TD_CELL} />
            </>
          ) : undefined
        }
      />
    </>
  );
}

function RaportBraki({ data }: { data: RaportBrakiKadrowe }) {
  const s = data.statystyki;
  const sumaGodziny = data.braki.reduce((acc, b) => acc + b.godzinyTygodniowo, 0);

  const columns: Column<RaportBrakiKadrowe['braki'][number]>[] = [
    {
      key: 'przedmiot',
      header: 'Przedmiot',
      sticky: true,
      render: (b) => (
        <Link href={`/przedmioty/${b.przedmiotId}`} className="font-medium text-accent hover:underline">
          {b.przedmiotNazwa}
        </Link>
      ),
    },
    {
      key: 'klasa',
      header: 'Klasa',
      render: (b) => (
        <Link href={`/klasy/${b.klasaId}`} className="text-accent hover:underline">
          {b.klasaNazwa}
        </Link>
      ),
    },
    {
      key: 'godziny',
      header: 'Godziny/tyg',
      align: 'center',
      className: 'font-medium tabular-nums',
      render: (b) => b.godzinyTygodniowo,
    },
    { key: 'powod', header: 'Powód', render: (b) => <span className="text-ink-soft">{b.powod}</span> },
    {
      key: 'dostepni',
      header: 'Dostępni',
      align: 'center',
      className: 'tabular-nums',
      render: (b) => b.dostepniNauczyciele,
    },
    {
      key: 'sugestie',
      header: 'Sugestie',
      render: (b) => (
        <ul className="list-inside list-disc text-ink-soft">
          {b.sugerowaneRozwiazania?.slice(0, 2).map((sugestia, i) => (
            <li key={i} className="text-xs">
              {sugestia}
            </li>
          ))}
        </ul>
      ),
    },
  ];

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

      <DataTable
        columns={columns}
        rows={data.braki}
        getRowKey={(_b, index) => index}
        stickyHeader
        empty="Brak braków kadrowych dla wybranych parametrów."
        footer={
          data.braki.length > 0 ? (
            <>
              <td className={`${TD_CELL} sticky left-0 z-10 bg-surface-2`}>Razem</td>
              <td className={TD_CELL} />
              <td className={`${TD_CELL} text-center tabular-nums`}>{sumaGodziny}</td>
              <td className={TD_CELL} />
              <td className={TD_CELL} />
              <td className={TD_CELL} />
            </>
          ) : undefined
        }
      />
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
  const [eksportuje, setEksportuje] = useState(false);

  const renderowalny = typ ? RENDEROWALNE.includes(typ) : false;

  useEffect(() => {
    const typZUrl = pathname?.split('/').pop() as TypRaportu;
    if (typZUrl && ['zgodnosc-mein', 'obciazenia', 'braki-kadrowe', 'arkusz-organizacyjny'].includes(typZUrl)) {
      setTyp(typZUrl);
      // „arkusz-organizacyjny" nie ma widoku ekranowego — tylko eksport XLS; nie pobieramy danych.
      if (typSzkolyId && RENDEROWALNE.includes(typZUrl)) {
        pobierzRaport(typZUrl);
      } else {
        setLadowanie(false);
      }
    } else {
      setLadowanie(false);
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
    if (!typSzkolyId || eksportuje) return;
    const url = `/api/export/xls?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}&typ=${
      typ === 'zgodnosc-mein' ? 'zgodnosc-mein' : 'arkusz-organizacyjny'
    }`;
    setEksportuje(true);
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
    } finally {
      setEksportuje(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={typ ? TYTUL[typ] : 'Raport'}
        actions={
          <>
            <Button variant="secondary" onClick={eksportujDoXLS} disabled={!typSzkolyId || eksportuje}>
              <Icon name="download" size={16} />
              {eksportuje ? 'Eksportowanie…' : 'Eksportuj do XLS'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/raporty')}>
              <Icon name="back" size={16} />
              Powrót
            </Button>
          </>
        }
      />

      {ladowanie ? (
        <Card>
          <div className="animate-pulse motion-reduce:animate-none space-y-4" role="status" aria-live="polite">
            <div className="h-8 w-1/3 rounded-sm bg-line" />
            <div className="h-4 w-1/2 rounded-sm bg-line" />
            <div className="h-4 w-2/3 rounded-sm bg-line" />
            <span className="sr-only">Wczytywanie raportu…</span>
          </div>
        </Card>
      ) : error ? (
        <div className="space-y-4">
          <div
            role="status"
            aria-live="polite"
            className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
          <Button variant="secondary" onClick={() => router.push('/raporty')}>
            <Icon name="back" size={16} />
            Powrót do raportów
          </Button>
        </div>
      ) : typ && !renderowalny ? (
        <Card className="flex gap-3 bg-warn-bg">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-warn" />
          <div className="text-sm text-ink-soft">
            <p className="font-medium text-ink">Raport w przygotowaniu</p>
            <p className="mt-1">
              Ten raport nie ma jeszcze widoku ekranowego. Możesz pobrać go jako plik XLS przyciskiem
              „Eksportuj do XLS” powyżej.
            </p>
          </div>
        </Card>
      ) : !typSzkolyId ? (
        <Card className="flex gap-3 bg-warn-bg">
          <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-sm text-ink-soft">
            Wybierz typ szkoły na liście raportów, aby wygenerować ten raport.
          </p>
        </Card>
      ) : (
        <>
          {typ === 'zgodnosc-mein' && dane && <RaportZgodnosci data={dane as RaportZgodnoscMein} />}
          {typ === 'obciazenia' && dane && <RaportObciazen data={dane as RaportObciazenia} />}
          {typ === 'braki-kadrowe' && dane && <RaportBraki data={dane as RaportBrakiKadrowe} />}
        </>
      )}
    </div>
  );
}
