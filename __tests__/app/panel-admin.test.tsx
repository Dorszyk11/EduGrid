/**
 * @jest-environment jsdom
 *
 * Test charakteryzujący panel-admin: utrwala zachowanie WIDOCZNE dla użytkownika
 * przed rozbiciem monolitu (SP3). Ma przejść tak samo przed i po refaktorze.
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/Toast';
import PanelAdminaPage from '@/app/panel-admin/page';

function jsonRes(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function installFetchMock() {
  const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/api/typy-szkol') && method === 'GET')
      return jsonRes([{ id: '1', nazwa: 'Liceum', liczba_lat: 4, kod_mein: 'LO' }]);
    if (url.includes('/api/przedmioty'))
      return jsonRes([{ id: 'p1', nazwa: 'Matematyka', typ_zajec: 'obowiazkowy', poziom: 'podstawowy' }]);
    if (url.includes('/api/klasy') && method === 'GET')
      return jsonRes({
        klasy: [
          {
            id: 'k1',
            nazwa: '1A',
            rok_szkolny: '2024/2028',
            profil: null,
            typ_szkoly: { id: '1', nazwa: 'Liceum' },
            can_manage: true,
          },
        ],
      });
    if (url.includes('/api/nauczyciele') && method === 'GET')
      return jsonRes([{ id: 'n1', imie: 'Jan', nazwisko: 'Kowalski', max_obciazenie: 18, przedmioty: [] }]);
    if (url.includes('/api/nauczyciele') && method === 'POST') return jsonRes({ id: 'n2' });
    return jsonRes({});
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('panel-admin (charakteryzacja)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('po załadowaniu pokazuje sekcje klas i nauczycieli z danymi', async () => {
    installFetchMock();
    render(
      <ToastProvider>
        <PanelAdminaPage />
      </ToastProvider>,
    );

    expect(await screen.findByText('Dodawanie klas')).toBeInTheDocument();
    expect(screen.getByText('Nauczyciele')).toBeInTheDocument();
    expect(await screen.findByText('1A')).toBeInTheDocument();
    expect(screen.getByText('Kowalski')).toBeInTheDocument();
  });

  it('dodanie nauczyciela wysyła POST /api/nauczyciele i odświeża listę', async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PanelAdminaPage />
      </ToastProvider>,
    );

    await screen.findByText('1A');

    await user.type(screen.getByPlaceholderText('np. Jan'), 'Anna');
    await user.type(screen.getByPlaceholderText('np. Kowalski'), 'Nowak');
    await user.click(screen.getByRole('button', { name: /Dodaj nauczyciela/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes('/api/nauczyciele') && init?.method === 'POST',
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(String((postCall![1] as RequestInit).body));
      expect(body).toMatchObject({ imie: 'Anna', nazwisko: 'Nowak' });
    });
  });
});
