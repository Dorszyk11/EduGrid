'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import KlasySection from '@/components/admin/KlasySection';
import NauczycieleSection from '@/components/admin/NauczycieleSection';
import type { TypSzkoly, Przedmiot, KlasaAdmin, NauczycielAdmin } from '@/components/admin/types';

export default function PanelAdminaPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [przedmioty, setPrzedmioty] = useState<Przedmiot[]>([]);
  const [klasy, setKlasy] = useState<KlasaAdmin[]>([]);
  const [nauczyciele, setNauczyciele] = useState<NauczycielAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rSzk, rPrz, rKlasy, rNaucz] = await Promise.all([
        fetch('/api/typy-szkol', { cache: 'no-store' }),
        fetch('/api/przedmioty', { cache: 'no-store' }),
        fetch('/api/klasy', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/nauczyciele', { cache: 'no-store' }),
      ]);
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
    } catch {
      setSzkoly([]);
      setPrzedmioty([]);
      setKlasy([]);
      setNauczyciele([]);
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

      {loading ? (
        <div className="py-12 text-center text-ink-faint">Ładowanie…</div>
      ) : (
        <div className="space-y-12">
          <KlasySection szkoly={szkoly} klasy={klasy} reload={fetchAll} />
          <NauczycieleSection przedmioty={przedmioty} nauczyciele={nauczyciele} reload={fetchAll} />
        </div>
      )}
    </div>
  );
}
