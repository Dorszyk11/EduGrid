/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('nie renderuje nic, gdy zamknięty', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="X" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('woła onConfirm po kliknięciu przycisku akcji', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog open title="Usunąć?" confirmLabel="Usuń" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: 'Usuń' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Esc woła onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="X" onConfirm={() => {}} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('klik w overlay woła onCancel; klik w panel nie', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Tytuł panelu" onConfirm={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByText('Tytuł panelu'));
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole('presentation'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('focus startowy (default) trafia na przycisk potwierdzenia', async () => {
    render(<ConfirmDialog open title="X" confirmLabel="OK" onConfirm={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus());
  });
});
