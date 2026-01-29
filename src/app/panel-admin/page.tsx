'use client';

import { useEffect, useState } from 'react';

interface TypSzkoly {
  id: string | number;
  nazwa: string;
  liczba_lat?: number;
  kod_mein?: string;
}

interface Przedmiot {
  id: string | number;
  nazwa: string;
  kod_mein?: string;
  typ_zajec: string;
  poziom: string;
  aktywny?: boolean;
}

const TYP_ZAJEC_OPTS = [
  { value: 'ogolnoksztalcace', label: 'Ogólnokształcące' },
  { value: 'zawodowe_teoretyczne', label: 'Zawodowe teoretyczne' },
  { value: 'zawodowe_praktyczne', label: 'Zawodowe praktyczne' },
];

const POZIOM_OPTS = [
  { value: 'podstawowy', label: 'Podstawowy' },
  { value: 'rozszerzony', label: 'Rozszerzony' },
  { value: 'brak', label: 'Brak podziału' },
];

export default function PanelAdminaPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [przedmioty, setPrzedmioty] = useState<Przedmiot[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [formSzkola, setFormSzkola] = useState({ nazwa: '', liczba_lat: '', kod_mein: '' });
  const [formPrzedmiot, setFormPrzedmiot] = useState({
    nazwa: '',
    kod_mein: '',
    typ_zajec: 'ogolnoksztalcace',
    poziom: 'podstawowy',
  });
  const [submittingSzkola, setSubmittingSzkola] = useState(false);
  const [submittingPrzedmiot, setSubmittingPrzedmiot] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPrzedmiotId, setDeletingPrzedmiotId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rSzk, rPrz] = await Promise.all([
        fetch('/api/typy-szkol'),
        fetch('/api/przedmioty'),
      ]);
      const szk = await rSzk.json();
      const prz = await rPrz.json();
      setSzkoly(Array.isArray(szk) ? szk : []);
      setPrzedmioty(Array.isArray(prz) ? prz : []);
    } catch {
      setSzkoly([]);
      setPrzedmioty([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddSzkola = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nazwa, liczba_lat, kod_mein } = formSzkola;
    if (!nazwa.trim() || !liczba_lat.trim() || !kod_mein.trim()) {
      setMsg({ type: 'err', text: 'Wypełnij nazwę, liczbę lat i kod MEiN.' });
      return;
    }
    const lat = Number(liczba_lat);
    if (Number.isNaN(lat) || lat < 1 || lat > 8) {
      setMsg({ type: 'err', text: 'Liczba lat: 1–8.' });
      return;
    }
    setSubmittingSzkola(true);
    setMsg(null);
    try {
      const res = await fetch('/api/typy-szkol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nazwa: nazwa.trim(),
          liczba_lat: lat,
          kod_mein: kod_mein.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Typ szkoły dodany.' });
      setFormSzkola({ nazwa: '', liczba_lat: '', kod_mein: '' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd dodawania.' });
    } finally {
      setSubmittingSzkola(false);
    }
  };

  const handleDeleteSzkola = async (s: TypSzkoly) => {
    if (!confirm(`Usunąć typ szkoły „${s.nazwa}”?`)) return;
    const id = String(s.id);
    setDeletingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/typy-szkol/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Typ szkoły usunięty.' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd usuwania.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPrzedmiot = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nazwa, kod_mein, typ_zajec, poziom } = formPrzedmiot;
    if (!nazwa.trim()) {
      setMsg({ type: 'err', text: 'Wypełnij nazwę przedmiotu.' });
      return;
    }
    setSubmittingPrzedmiot(true);
    setMsg(null);
    try {
      const res = await fetch('/api/przedmioty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nazwa: nazwa.trim(),
          kod_mein: kod_mein.trim() || undefined,
          typ_zajec,
          poziom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Przedmiot dodany.' });
      setFormPrzedmiot({ nazwa: '', kod_mein: '', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd dodawania.' });
    } finally {
      setSubmittingPrzedmiot(false);
    }
  };

  const handleDeletePrzedmiot = async (p: Przedmiot) => {
    if (!confirm(`Usunąć przedmiot „${p.nazwa}”?`)) return;
    const id = String(p.id);
    setDeletingPrzedmiotId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/przedmioty/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Przedmiot usunięty.' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd usuwania.' });
    } finally {
      setDeletingPrzedmiotId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Panel admina</h1>
      <p className="text-gray-600 mb-8">
        Dodawanie typów szkół i przedmiotów. Klasy, nauczyciele, siatki MEiN itd. w Panelu Payload.
      </p>

      {msg && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Ładowanie…</div>
      ) : (
        <div className="space-y-12">
          {/* Szkoły */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Typy szkół</h2>
              <p className="text-sm text-gray-600 mt-0.5">Dodaj nowy typ szkoły (nazwa, liczba lat, kod MEiN).</p>
            </div>
            <div className="p-5 space-y-5">
              <form onSubmit={handleAddSzkola} className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Nazwa</span>
                  <input
                    type="text"
                    value={formSzkola.nazwa}
                    onChange={(e) => setFormSzkola((s) => ({ ...s, nazwa: e.target.value }))}
                    placeholder="np. Liceum ogólnokształcące"
                    className="rounded-lg border border-gray-300 px-3 py-2 w-64"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Liczba lat</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formSzkola.liczba_lat}
                    onChange={(e) => setFormSzkola((s) => ({ ...s, liczba_lat: e.target.value }))}
                    placeholder="4"
                    className="rounded-lg border border-gray-300 px-3 py-2 w-24"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Kod MEiN</span>
                  <input
                    type="text"
                    value={formSzkola.kod_mein}
                    onChange={(e) => setFormSzkola((s) => ({ ...s, kod_mein: e.target.value }))}
                    placeholder="LO"
                    className="rounded-lg border border-gray-300 px-3 py-2 w-28"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submittingSzkola}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {submittingSzkola ? 'Dodawanie…' : 'Dodaj szkołę'}
                </button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Kod MEiN</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Lata</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 text-right w-24">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {szkoly.map((s) => (
                      <tr key={String(s.id)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium text-gray-900">{s.nazwa}</td>
                        <td className="px-4 py-2 text-gray-600">{s.kod_mein ?? '–'}</td>
                        <td className="px-4 py-2 text-gray-600">{s.liczba_lat ?? '–'}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSzkola(s)}
                            disabled={deletingId === String(s.id)}
                            className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            {deletingId === String(s.id) ? '…' : 'Usuń'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {szkoly.length === 0 && (
                  <p className="py-6 text-center text-gray-500 text-sm">Brak typów szkół. Dodaj pierwszy powyżej.</p>
                )}
              </div>
            </div>
          </section>

          {/* Przedmioty */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Przedmioty</h2>
              <p className="text-sm text-gray-600 mt-0.5">Dodaj nowy przedmiot (nazwa, typ zajęć, poziom).</p>
            </div>
            <div className="p-5 space-y-5">
              <form onSubmit={handleAddPrzedmiot} className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Nazwa</span>
                  <input
                    type="text"
                    value={formPrzedmiot.nazwa}
                    onChange={(e) => setFormPrzedmiot((s) => ({ ...s, nazwa: e.target.value }))}
                    placeholder="np. Język polski"
                    className="rounded-lg border border-gray-300 px-3 py-2 w-56"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Kod MEiN</span>
                  <input
                    type="text"
                    value={formPrzedmiot.kod_mein}
                    onChange={(e) => setFormPrzedmiot((s) => ({ ...s, kod_mein: e.target.value }))}
                    placeholder="JP (opcjonalnie)"
                    className="rounded-lg border border-gray-300 px-3 py-2 w-28"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Typ zajęć</span>
                  <select
                    value={formPrzedmiot.typ_zajec}
                    onChange={(e) => setFormPrzedmiot((s) => ({ ...s, typ_zajec: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 w-44"
                  >
                    {TYP_ZAJEC_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Poziom</span>
                  <select
                    value={formPrzedmiot.poziom}
                    onChange={(e) => setFormPrzedmiot((s) => ({ ...s, poziom: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 w-36"
                  >
                    {POZIOM_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={submittingPrzedmiot}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {submittingPrzedmiot ? 'Dodawanie…' : 'Dodaj przedmiot'}
                </button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Kod MEiN</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Typ</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Poziom</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 text-right w-24">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {przedmioty.map((p) => (
                      <tr key={String(p.id)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.nazwa}</td>
                        <td className="px-4 py-2 text-gray-600">{p.kod_mein ?? '–'}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {TYP_ZAJEC_OPTS.find((o) => o.value === p.typ_zajec)?.label ?? p.typ_zajec}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {POZIOM_OPTS.find((o) => o.value === p.poziom)?.label ?? p.poziom}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePrzedmiot(p)}
                            disabled={deletingPrzedmiotId === String(p.id)}
                            className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            {deletingPrzedmiotId === String(p.id) ? '…' : 'Usuń'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {przedmioty.length === 0 && (
                  <p className="py-6 text-center text-gray-500 text-sm">Brak przedmiotów. Dodaj pierwszy powyżej.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
