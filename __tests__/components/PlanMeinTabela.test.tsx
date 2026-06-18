/**
 * @jest-environment jsdom
 *
 * Siatka regresyjna (Krok 0) dla PlanMeinTabela — pinuje obecne zachowanie
 * ZANIM wydzielimy podkomponenty (Krok 2: TabelaDoradztwa, Krok 3: ModalPonadprogramowy).
 * Cel: jeśli ekstrakcja zmieni zachowanie, te testy zrobią się czerwone.
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';

type FetchCall = { url: string; method: string; body: unknown };
let calls: FetchCall[];

beforeEach(() => {
  calls = [];
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    let body: unknown = undefined;
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, method, body });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  }) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

it('pokazuje komunikat o braku planu dla nieznanego typu szkoły', () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Przedszkole kosmiczne" />);
  expect(screen.getByText(/Brak planu ramowego MEiN/)).toBeInTheDocument();
});

it('renderuje sekcję doradztwa dla Liceum (bez klasaId — bez zapisu do API)', () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Liceum ogólnokształcące" />);
  expect(screen.queryByText(/Brak planu ramowego MEiN/)).not.toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Zajęcia z zakresu doradztwa zawodowego' }),
  ).toBeInTheDocument();
  // Bez klasaId komponent nie odpytuje API
  expect(calls.filter((c) => c.url.includes('/api/przydzial-godzin-wybor'))).toHaveLength(0);
});

it('z klasaId ładuje dane z API i pokazuje przyciski "+ Dodaj" w doradztwie', async () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Liceum ogólnokształcące" klasaId="klasa-1" />);
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'GET' && c.url.includes('klasaId=klasa-1'))).toBe(true),
  );
  expect((await screen.findAllByRole('button', { name: '+ Dodaj' })).length).toBeGreaterThan(0);
});

it('klik "+ Dodaj" w doradztwie zapisuje POST z wypełnionym body.doradztwo', async () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Liceum ogólnokształcące" klasaId="klasa-1" />);
  const dodajButtons = await screen.findAllByRole('button', { name: '+ Dodaj' });
  fireEvent.click(dodajButtons[0]);

  await waitFor(() =>
    expect(
      calls.some((c) => c.method === 'POST' && c.url.includes('/api/przydzial-godzin-wybor')),
    ).toBe(true),
  );
  const post = calls.find(
    (c) => c.method === 'POST' && c.url.includes('/api/przydzial-godzin-wybor'),
  )!;
  const body = post.body as { klasaId: string; doradztwo: Record<string, Record<string, number>> };
  expect(body.klasaId).toBe('klasa-1');
  const doradztwoKeys = Object.keys(body.doradztwo);
  expect(doradztwoKeys.length).toBeGreaterThan(0);
  // pierwsza komórka to rocznik "I" → zapisana 1 godzina
  const firstEntry = body.doradztwo[doradztwoKeys[0]];
  expect(Object.values(firstEntry).reduce((a, b) => a + b, 0)).toBe(1);
});

// --- Główna tabela (Technikum ma przedmioty z „godzinami do wyboru" + wiersz dyrektorski) ---

function lastPost() {
  return [...calls].reverse().find(
    (c) => c.method === 'POST' && c.url.includes('/api/przydzial-godzin-wybor'),
  );
}

it('renderuje strukturę głównej tabeli (Lp./Razem/tfoot Suma godzin)', () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Technikum" />);
  expect(screen.getByText('Lp.')).toBeInTheDocument();
  expect(screen.getAllByText('Razem').length).toBeGreaterThan(0);
  expect(screen.getByText('Suma godzin w roku')).toBeInTheDocument();
  expect(screen.getByText('Godziny do dyspozycji dyrektora')).toBeInTheDocument();
});

it('tryb „Przydziel godzinę": klik w komórkę zapisuje POST z body.przydzial=1', async () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Technikum" klasaId="kl-T" trybPrzydzielGodzine />);
  const cells = await screen.findAllByTitle(/dodać 1 godzinę do wyboru/);
  fireEvent.click(cells[0]);
  await waitFor(() => expect(lastPost()).toBeTruthy());
  const body = lastPost()!.body as { przydzial: Record<string, Record<string, number>> };
  const keys = Object.keys(body.przydzial);
  expect(keys.length).toBeGreaterThan(0);
  expect(Object.values(body.przydzial[keys[0]]).reduce((a, b) => a + b, 0)).toBe(1);
});

it('tryb „Godz. dyrektorskie": klik w komórkę zapisuje POST z body.dyrektor', async () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Technikum" klasaId="kl-T" trybPrzydzielDyrektor />);
  const cells = await screen.findAllByTitle(/godzinę dyrektorską/);
  fireEvent.click(cells[0]);
  await waitFor(() => expect(lastPost()).toBeTruthy());
  const body = lastPost()!.body as { dyrektor: Record<string, Record<string, number>> };
  const keys = Object.keys(body.dyrektor);
  expect(keys.length).toBeGreaterThan(0);
  expect(Object.values(body.dyrektor[keys[0]]).reduce((a, b) => a + b, 0)).toBe(1);
});

it('tryb „Dodaj rozszerzenia": klik w nazwę przedmiotu zapisuje POST z body.rozszerzenia', async () => {
  render(<PlanMeinTabela nazwaTypuSzkoly="Technikum" klasaId="kl-T" trybDodajRozszerzenia />);
  const nameButtons = await screen.findAllByRole('button', { name: /Geografia/ });
  fireEvent.click(nameButtons[0]);
  await waitFor(() => expect(lastPost()).toBeTruthy());
  const body = lastPost()!.body as { rozszerzenia: string[] };
  expect(Array.isArray(body.rozszerzenia)).toBe(true);
  expect(body.rozszerzenia.length).toBeGreaterThan(0);
});
