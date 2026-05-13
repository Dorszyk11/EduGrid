"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-semibold text-edu-ink"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          "block w-full rounded-lg border px-3 py-2.5 text-sm transition-shadow duration-150 ease-edu-out touch-manipulation",
          "focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-bg",
          error
            ? "border-red-300 bg-edu-danger-soft text-edu-ink placeholder:text-red-400"
            : "border-edu-border-strong bg-edu-surface text-edu-ink placeholder:text-edu-subtle hover:border-edu-accent-muted/50",
          className,
        ].join(" ")}
        {...props}
      />
      {error && <p className="mt-1 text-sm font-medium text-edu-danger">{error}</p>}
    </div>
  );
});
