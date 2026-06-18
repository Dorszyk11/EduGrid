/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/ui/Modal';

it('dialog ma aria-modal i reaguje na Esc', () => {
  const onClose = jest.fn();
  render(
    <Modal open title="Tytuł" onClose={onClose}>
      <button>OK</button>
    </Modal>,
  );
  const dlg = screen.getByRole('dialog');
  expect(dlg).toHaveAttribute('aria-modal', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
