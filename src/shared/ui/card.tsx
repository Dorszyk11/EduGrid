import { type ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, children, className = "", action }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-edu-border bg-edu-surface shadow-edu-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edu-border px-5 py-4 sm:px-6">
          {title && (
            <h3 className="font-serif text-lg font-semibold leading-tight text-edu-ink">{title}</h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </div>
  );
}
