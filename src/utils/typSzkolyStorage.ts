const STORAGE_KEY_TYP = 'edugrid-typ-szkoly-id';
const STORAGE_KEY_ROCZNIK = 'edugrid-rocznik';
const STORAGE_KEY_LITERA = 'edugrid-litera';

export function getZapamietanyTypSzkoly(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    const v = localStorage.getItem(STORAGE_KEY_TYP);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export function zapiszTypSzkoly(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TYP, id);
  } catch {
    // ignoruj błędy
  }
}

export function getZapamietanyRocznik(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    const v = localStorage.getItem(STORAGE_KEY_ROCZNIK);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export function zapiszRocznik(rocznik: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ROCZNIK, rocznik);
  } catch {
    // ignoruj błędy
  }
}

export function getZapamietanaLitera(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    const v = localStorage.getItem(STORAGE_KEY_LITERA);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export function zapiszLitera(litera: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LITERA, litera);
  } catch {
    // ignoruj błędy
  }
}
