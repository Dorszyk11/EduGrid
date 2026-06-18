import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const BASE =
  'w-full px-3 py-2 rounded-sm border bg-surface text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:opacity-50';

/** Prymityw pola wyboru — analogiczny do Input, dla `<select>`. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid = false, className = '', ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${BASE} ${invalid ? 'border-danger' : 'border-line-strong'} ${className}`}
      {...props}
    />
  ),
);

Select.displayName = 'Select';

export default Select;
