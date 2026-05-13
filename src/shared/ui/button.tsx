"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-edu-accent text-white shadow-edu-inner hover:bg-edu-accent-hover focus-visible:ring-edu-accent edu-press border border-edu-accent-hover/20",
  secondary:
    "bg-edu-surface text-edu-ink border border-edu-border-strong hover:bg-edu-bg-subtle focus-visible:ring-edu-accent edu-press",
  danger:
    "bg-edu-danger text-white hover:opacity-95 focus-visible:ring-red-600 edu-press",
  ghost:
    "text-edu-muted hover:bg-edu-bg-subtle hover:text-edu-ink focus-visible:ring-edu-accent edu-press",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base font-semibold",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 ease-edu-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-edu-bg",
          "disabled:pointer-events-none disabled:opacity-45",
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-edu-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-30"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
