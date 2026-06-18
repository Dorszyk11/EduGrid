'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import AsyncSection from '@/components/ui/AsyncSection';
import KlasySection from '@/components/admin/KlasySection';
import NauczycieleSection from '@/components/admin/NauczycieleSection';
import type { TypSzkoly, Przedmiot, KlasaAdmin, NauczycielAdmin } from '@/components/admin/types';

export default function PanelAdminaPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [przedmioty, setPrzedmioty] = useState<Przedmiot[]>([]);
  const [klasy, setKlasy] = useState<KlasaAdmin[]>([]);
  const [nauczyciele, setNauczyciele] = useState<NauczycielAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rSzk, rPrz, rKlasy, rNaucz] = await Promise.all([
        fetch('/api/typy-szkol', { cache: 'no-store' }),
        fetch('/api/przedmioty', { cache: 'no-store' }),
        fetch('/api/klasy', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/nauczyciele', { cache: 'no-store' }),
      ]);
      if (!rSzk.ok || !rPrz.ok || !rKlasy.ok || !rNaucz.ok) {
        throw new Error('Nie udało się pobrać danych panelu administracyjnego.');
      }
      const [szk, prz, kl, naucz] = await Promise.all([
        rSzk.json(),
        rPrz.json(),
        rKlasy.json(),
        rNaucz.json(),
      ]);
      setSzkoly(Array.isArray(szk) ? szk : []);
      setPrzedmioty(Array.isArray(prz) ? prz : []);
      setKlasy(kl.klasy ?? []);
      setNauczyciele(Array.isArray(naucz) ? naucz : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd podczas wczytywania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="max-w-5xl p-6 md:p-8">
      <div className="mb-6">
        <PageHeader title="Panel admina" />
      </div>

      <AsyncSection loading={loading} error={error} loadingLabel="Wczytywanie danych panelu…">
        <div className="space-y-12">
          <KlasySection szkoly={szkoly} klasy={klasy} reload={fetchAll} />
          <NauczycieleSection przedmioty={przedmioty} nauczyciele={nauczyciele} reload={fetchAll} />
        </div>
      </AsyncSection>
    </div>
  );
}
