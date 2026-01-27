# Instalacja i konfiguracja Dashboardu

## Wymagania

Dashboard używa:
- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS** (dla stylowania)

## Instalacja Tailwind CSS

Jeśli Tailwind CSS nie jest jeszcze zainstalowany:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Konfiguracja `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Dodaj do `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Opcjonalnie: shadcn/ui

Jeśli chcesz użyć komponentów shadcn/ui (bardziej zaawansowane komponenty):

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add card table badge progress
```

Następnie zaktualizuj komponenty, aby używały komponentów shadcn/ui zamiast podstawowych divów.

## Uruchomienie

```bash
npm run dev
```

Dashboard będzie dostępny pod adresem: `http://localhost:3000/dashboard`

## Konfiguracja

### Wybór typu szkoły

W komponencie `DashboardPage` dodaj selektor typów szkół:

```typescript
// Pobierz typy szkół
const [typySzkol, setTypySzkol] = useState([]);

useEffect(() => {
  fetch('/api/typy-szkol')
    .then(res => res.json())
    .then(data => setTypySzkol(data));
}, []);

// W JSX:
<select
  value={typSzkolyId}
  onChange={(e) => setTypSzkolyId(e.target.value)}
>
  <option value="">Wybierz typ szkoły</option>
  {typySzkol.map(typ => (
    <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
  ))}
</select>
```

## Rozwiązywanie problemów

### Błąd: "Cannot find module '@/...'"

Sprawdź `tsconfig.json` - powinien mieć:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Błąd: "Tailwind classes not working"

1. Sprawdź, czy `tailwind.config.js` ma poprawne ścieżki w `content`
2. Sprawdź, czy `globals.css` importuje Tailwind
3. Zrestartuj serwer deweloperski

### Dashboard nie ładuje danych

1. Sprawdź, czy API endpoints działają (otwórz w przeglądarce)
2. Sprawdź konsolę przeglądarki (F12) - mogą być błędy
3. Sprawdź, czy `typSzkolyId` jest ustawione

---

**Gotowe!** Dashboard powinien działać po instalacji Tailwind CSS.
