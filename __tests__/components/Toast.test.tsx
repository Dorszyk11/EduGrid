/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/components/ui/Toast';

function Trigger() {
  const { success } = useToast();
  return <button onClick={() => success('Zapisano')}>pokaż</button>;
}

describe('Toast', () => {
  it('pokazuje toast i znika po auto-dismiss', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByText('pokaż'));
    expect(screen.getByText('Zapisano')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Zapisano')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('można zamknąć ręcznie', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByText('pokaż'));
    await user.click(screen.getByRole('button', { name: 'Zamknij powiadomienie' }));
    expect(screen.queryByText('Zapisano')).not.toBeInTheDocument();
  });

  it('useToast bez providera rzuca błąd', () => {
    const Bad = () => {
      useToast();
      return null;
    };
    // wyciszamy oczekiwany błąd Reacta w konsoli
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
