/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RealizacjaPage from '@/app/realizacja/page';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response),
  ) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

it('renderuje nagłówek i selektor klasy', async () => {
  render(<RealizacjaPage />);
  expect(await screen.findByText('Realizacja')).toBeInTheDocument();
  expect(screen.getByText('Wybierz klasę')).toBeInTheDocument();
});
