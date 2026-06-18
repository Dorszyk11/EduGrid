/**
 * Jedno źródło prawdy dla nawigacji aplikacji (A5): grupy menu w `Sidebar`
 * oraz okruszki (breadcrumb) w `AppBar`. Ikony — semantyczne nazwy z `ui/Icon`.
 *
 * Kolejność grup i pozycji jest celowa (Planowanie → Analiza → Konfiguracja →
 * Dane MEiN → Administracja). Dashboard stoi osobno, bez etykiety grupy.
 */
import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  name: string;
  href: string;
  icon: IconName;
}

export interface NavGroup {
  /** Etykieta grupy w menu; `null` = grupa bez nagłówka (np. Dashboard). */
  label: string | null;
  items: NavItem[];
}

export const NAWIGACJA: NavGroup[] = [
  {
    label: null,
    items: [{ name: 'Dashboard', href: '/dashboard', icon: 'dashboard' }],
  },
  {
    label: 'Planowanie',
    items: [
      { name: 'Przydział', href: '/przydzial', icon: 'przydzial' },
      { name: 'Realizacja', href: '/realizacja', icon: 'realizacja' },
      { name: 'Dyspozycja', href: '/dyspozycja', icon: 'dyspozycja' },
    ],
  },
  {
    label: 'Analiza',
    items: [
      { name: 'Raporty', href: '/raporty', icon: 'raporty' },
      { name: 'Zapotrzebowanie kadrowe', href: '/zapotrzebowanie-kadrowe', icon: 'kadry' },
    ],
  },
  {
    label: 'Konfiguracja',
    items: [
      { name: 'Szkoły', href: '/szkoly', icon: 'szkoly' },
      { name: 'Klasy', href: '/klasy', icon: 'klasy' },
      { name: 'Nauczyciele', href: '/nauczyciele', icon: 'nauczyciele' },
    ],
  },
  {
    label: 'Dane MEiN',
    items: [
      { name: 'Plany MEiN', href: '/plany-mein', icon: 'plany-mein' },
      { name: 'Siatka szkoły', href: '/siatka-szkoly', icon: 'siatka-szkoly' },
      { name: 'Mapowania', href: '/mapowania', icon: 'mapowania' },
      { name: 'Import PDF', href: '/import/mein-pdf', icon: 'import' },
    ],
  },
  {
    label: 'Administracja',
    items: [{ name: 'Panel admina', href: '/panel-admin', icon: 'admin' }],
  },
];

/** Mapa href → { label pozycji, label grupy nadrzędnej } dla breadcrumbów. */
interface WpisMapy {
  label: string;
  grupa: string | null;
}

const MAPA_HREF: Record<string, WpisMapy> = NAWIGACJA.reduce<Record<string, WpisMapy>>(
  (acc, grupa) => {
    for (const item of grupa.items) {
      acc[item.href] = { label: item.name, grupa: grupa.label };
    }
    return acc;
  },
  {},
);

export interface Breadcrumb {
  label: string;
  href: string;
}

/**
 * Buduje okruszki dla ścieżki: zawsze „Dashboard", a następnie — jeśli ekran ma
 * grupę nadrzędną — etykieta grupy (bez linku własnego) i etykieta ekranu.
 * Dopasowuje najdłuższy pasujący prefiks href (obsługa zagnieżdżeń np. `/klasy/123`).
 */
export function breadcrumbDla(pathname: string): Breadcrumb[] {
  const home: Breadcrumb = { label: 'Dashboard', href: '/dashboard' };

  // Najdłuższy pasujący href z mapy (dokładny lub prefiks segmentowy).
  const dopasowany = Object.keys(MAPA_HREF)
    .filter((href) => pathname === href || pathname.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0];

  if (!dopasowany) return [home];
  if (dopasowany === '/dashboard') return [home];

  const wpis = MAPA_HREF[dopasowany];
  const okruszki: Breadcrumb[] = [home];
  if (wpis.grupa) {
    // Grupa nie ma własnej strony — link wskazuje na bieżący ekran (no-op nawigacyjny).
    okruszki.push({ label: wpis.grupa, href: dopasowany });
  }
  okruszki.push({ label: wpis.label, href: dopasowany });
  return okruszki;
}
