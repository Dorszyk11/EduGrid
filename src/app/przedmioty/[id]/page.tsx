'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AsyncSection from '@/components/ui/AsyncSection';
import Icon from '@/components/ui/Icon';
import { useResource } from '@/lib/hooks/useResource';
import type { PrzedmiotSzczegoly } from '@/types/api';

export default function PrzedmiotPage() {
  const params = useParams();
  const przedmiotId = params.id as string;

  const { data, loading, error } = useResource<PrzedmiotSzczegoly>(async (signal) => {
    const res = await fetch(`/api/przedmioty/${przedmiotId}`, { signal });
    if (!res.ok) throw new Error(`Błąd pobierania (HTTP ${res.status})`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  }, [przedmiotId]);

  return (
    <div className="space-y-6 p-6">
      <AsyncSection loading={loading} error={error} loadingLabel="Ładowanie danych przedmiotu...">
        {data && (
          <>
            <PageHeader
              title={data.przedmiot.nazwa}
              description={[
                data.przedmiot.typ_zajec,
                data.przedmiot.poziom,
                data.przedmiot.kod_mein && `Kod MEiN: ${data.przedmiot.kod_mein}`,
              ]
                .filter(Boolean)
                .join(' • ')}
              actions={
                <Link href="/dashboard" className={buttonClass('ghost')}>
                  <Icon name="back" size={16} />
                  Dashboard
                </Link>
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <p className="text-sm text-ink-soft">Łączna liczba godzin</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{data.podsumowanie.laczna_godziny}</p>
              </Card>
              <Card>
                <p className="text-sm text-ink-soft">Liczba klas</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{data.podsumowanie.liczba_klas}</p>
              </Card>
              <Card>
                <p className="text-sm text-ink-soft">Liczba nauczycieli</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {data.podsumowanie.liczba_nauczycieli}
                </p>
              </Card>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-ink">Podział na klasy</h2>
              <div className="space-y-4">
                {data.klasy.map((item, index) => (
                  <Card key={index}>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/klasy/${item.klasa.id}`}
                          className="text-lg font-semibold text-accent hover:underline"
                        >
                          {item.klasa.nazwa}
                        </Link>
                        {item.klasa.profil && (
                          <p className="text-sm text-ink-soft">Profil: {item.klasa.profil}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
                        <p className="text-xl font-bold tabular-nums text-ink">{item.godziny_tyg}</p>
                      </div>
                    </div>

                    <div className="border-t border-line pt-3">
                      <p className="mb-2 text-sm font-semibold text-ink">Nauczyciele:</p>
                      {item.nauczyciele.length > 0 ? (
                        <ul className="space-y-2">
                          {item.nauczyciele.map((n) => (
                            <li
                              key={n.id}
                              className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2"
                            >
                              <Link href={`/nauczyciele/${n.id}`} className="text-accent hover:underline">
                                {n.imie} {n.nazwisko}
                              </Link>
                              <span className="text-sm tabular-nums text-ink-soft">
                                {n.godziny_tyg}h/tyg • {n.godziny_roczne}h/rok
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-ink-faint">Brak przypisanych nauczycieli</p>
                      )}
                      <p className="mt-2 border-t border-line pt-2 text-sm text-ink-soft">
                        Razem:{' '}
                        <span className="font-semibold text-ink">{item.godziny_roczne} godzin rocznie</span>
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </AsyncSection>
    </div>
  );
}
