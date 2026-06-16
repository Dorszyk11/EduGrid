import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Wewnętrzny padding karty. `none` — gdy karta sama zarządza odstępami (np. tabela na całą szerokość). */
  padding?: 'none' | 'sm' | 'md';
}

/** Powierzchnia treści: białe tło, włosowe obramowanie, miękki cień. */
export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5';
  return (
    <div className={`bg-surface border border-line rounded-card shadow-card ${pad} ${className}`}>
      {children}
    </div>
  );
}
