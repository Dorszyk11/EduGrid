import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 ease-brand disabled:opacity-50 disabled:pointer-events-none';

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
};

/** Zwraca klasy przycisku — do użycia także na `<Link>` (gdy potrzebny element kotwicy). */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}
