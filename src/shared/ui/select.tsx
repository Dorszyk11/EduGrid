"use client";

import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, error, options, placeholder, className = "", id, ...props },
    ref,
  ) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1 block text-sm font-semibold text-edu-ink"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "block w-full rounded-lg border px-3 py-2.5 text-sm transition-shadow duration-150 ease-edu-out touch-manipulation",
            "focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-bg",
            error
              ? "border-red-300 bg-edu-danger-soft text-edu-ink"
              : "border-edu-border-strong bg-edu-surface text-edu-ink hover:border-edu-accent-muted/50",
            className,
          ].join(" ")}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm font-medium text-edu-danger">{error}</p>}
      </div>
    );
  },
);
