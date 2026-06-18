/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import KomorkaStatusu from '@/components/ui/KomorkaStatusu';

describe('KomorkaStatusu', () => {
  it('pokazuje liczby, znak i dostępny opis', () => {
    render(<KomorkaStatusu zrealizowane={4} docelowe={5} />);
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();
    expect(screen.getByLabelText('4 z 5, brakuje 1')).toBeInTheDocument();
  });

  it('nadwyżka ma znak +N', () => {
    render(<KomorkaStatusu zrealizowane={7} docelowe={5} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
