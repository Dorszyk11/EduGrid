import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const BASE =
  'w-full px-3 py-2 rounded-sm border bg-surface text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:opacity-50';

/** Prymityw pola tekstowego — spójne tokeny, fokus-ring, stan invalid (czerwone obramowanie). */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid = false, className = '', ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${BASE} ${invalid ? 'border-danger' : 'border-line-strong'} ${className}`}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export default Input;
