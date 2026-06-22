import {
  Plus,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeft,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  BarChart3,
  LayoutGrid,
  CalendarClock,
  ClipboardList,
  ClipboardCheck,
  Briefcase,
  School,
  Grid3x3,
  ArrowLeftRight,
  FileBarChart,
  Users,
  GraduationCap,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/** Ikony akcji aplikacji (lucide). Nazwy semantyczne — niezależne od konkretnej ikony. */
const ICONS = {
  plus: Plus,
  reset: RotateCcw,
  download: Download,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  back: ArrowLeft,
  trash: Trash2,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  close: X,
  file: FileText,
  chart: BarChart3,
  // Nawigacja (A5) — semantyczne nazwy ekranów EduGrid.
  dashboard: LayoutGrid,
  przydzial: ClipboardList,
  realizacja: CalendarClock,
  dyspozycja: ClipboardCheck,
  kadry: Briefcase,
  szkoly: School,
  klasy: GraduationCap,
  nauczyciele: Users,
  'plany-mein': FileText,
  'siatka-szkoly': Grid3x3,
  mapowania: ArrowLeftRight,
  raporty: FileBarChart,
  admin: Settings,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  /** Rozmiar w px (domyślnie 16). */
  size?: number;
  className?: string;
  /** Gdy podane — ikona niesie znaczenie i dostaje aria-label; inaczej jest aria-hidden. */
  label?: string;
}

/** Cienki wrapper na lucide: spójny rozmiar/stroke/a11y w jednym miejscu. */
export default function Icon({ name, size = 16, className, label }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
    />
  );
}
