/**
 * @jest-environment jsdom
 *
 * Smoke/charakteryzacja: po splicie strona renderuje się i pokazuje selektory.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DyspozycjaPage from '@/app/dyspozycja/page';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response),
  ) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

it('renderuje nagłówek i selektor typu szkoły', async () => {
  render(<DyspozycjaPage />);
  expect(await screen.findByText('Dyspozycja')).toBeInTheDocument();
  expect(screen.getByText('Typ szkoły')).toBeInTheDocument();
});
