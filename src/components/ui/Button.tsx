import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'toggle';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-[transform,background-color,color] duration-150 ease-brand pointer-fine:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none';

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

const SECONDARY = 'bg-surface text-ink border border-line-strong hover:bg-surface-2';
const TOGGLE_ACTIVE = 'bg-accent-weak text-accent-strong border border-accent/40';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: SECONDARY,
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
  toggle: SECONDARY,
};

/**
 * Zwraca klasy przycisku — do użycia także na `<Link>` (gdy potrzebny element kotwicy).
 * Dla wariantu `toggle` parametr `active` przełącza wygląd aktywny/nieaktywny.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  active = false,
): string {
  const variantClass = variant === 'toggle' && active ? TOGGLE_ACTIVE : VARIANT[variant];
  return `${BASE} ${SIZE[size]} ${variantClass}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tylko dla `variant="toggle"`: czy przycisk jest w stanie aktywnym. */
  active?: boolean;
}

export default function Button({ variant = 'primary', size = 'md', active = false, className = '', ...props }: ButtonProps) {
  const ariaPressed = variant === 'toggle' ? active : undefined;
  return <button aria-pressed={ariaPressed} className={`${buttonClass(variant, size, active)} ${className}`} {...props} />;
}
