/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

describe('Field', () => {
  it('etykieta wskazuje pole, błąd ma role=alert', () => {
    render(<Field label="Email" htmlFor="email" error="Wymagane"><Input id="email" aria-invalid /></Field>);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Wymagane');
  });
});
