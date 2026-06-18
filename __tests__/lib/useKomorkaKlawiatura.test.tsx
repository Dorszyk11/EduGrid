/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKomorkaKlawiatura } from '@/lib/hooks/useKomorkaKlawiatura';

function Consumer({ onActivate }: { onActivate: () => void }) {
  const props = useKomorkaKlawiatura(onActivate);
  return (
    <div data-testid="komorka" {...props}>
      komorka
    </div>
  );
}

describe('useKomorkaKlawiatura', () => {
  it('zwraca semantykę przycisku do spreadowania', () => {
    render(<Consumer onActivate={jest.fn()} />);
    const komorka = screen.getByTestId('komorka');
    expect(komorka).toHaveAttribute('role', 'button');
    expect(komorka).toHaveAttribute('tabindex', '0');
  });

  it('Enter woła onActivate', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn();
    render(<Consumer onActivate={onActivate} />);
    screen.getByTestId('komorka').focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('Space woła onActivate', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn();
    render(<Consumer onActivate={onActivate} />);
    screen.getByTestId('komorka').focus();
    await user.keyboard('[Space]');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('klik woła onActivate', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn();
    render(<Consumer onActivate={onActivate} />);
    await user.click(screen.getByTestId('komorka'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('inne klawisze nie wołają onActivate', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn();
    render(<Consumer onActivate={onActivate} />);
    screen.getByTestId('komorka').focus();
    await user.keyboard('a');
    expect(onActivate).not.toHaveBeenCalled();
  });
});
