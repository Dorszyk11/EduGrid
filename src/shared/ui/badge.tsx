"use client";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  success: "bg-edu-success-soft text-edu-success ring-1 ring-edu-success/25",
  warning: "bg-edu-warning-soft text-edu-warning ring-1 ring-edu-warning/25",
  danger: "bg-edu-danger-soft text-edu-danger ring-1 ring-edu-danger/25",
  info: "bg-[#e8eef7] text-edu-accent ring-1 ring-edu-accent/25",
  neutral: "bg-edu-bg-subtle text-edu-muted ring-1 ring-edu-border",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${BADGE_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
