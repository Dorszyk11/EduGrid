# Dashboard dla Dyrektora Szkoły

## Przegląd

Dashboard pokazuje kluczowe informacje dla dyrektora szkoły:
- ✅ Realizację wymagań MEiN
- ✅ Braki i nadwyżki godzin
- ✅ Obciążenie nauczycieli
- ✅ Braki kadrowe

## Struktura

### API Endpoints

1. **`/api/dashboard/podsumowanie`** - Ogólne statystyki
2. **`/api/dashboard/zgodnosc-mein`** - Zgodność z wymaganiami MEiN
3. **`/api/dashboard/obciazenie-nauczycieli`** - Obciążenie nauczycieli
4. **`/api/dashboard/braki-kadrowe`** - Braki kadrowe

### Komponenty UI

1. **`DashboardKarty`** - Karty z podsumowaniem (4 karty)
2. **`ZgodnoscMeinWykres`** - Wykres i tabela zgodności z MEiN
3. **`ObciazenieNauczycieliTabela`** - Tabela obciążeń nauczycieli
4. **`BrakiKadroweLista`** - Lista braków kadrowych

### Strona

**`/dashboard`** - Główna strona dashboardu

## Funkcjonalności

### 1. Karty podsumowujące

Wyświetlają:
- **Zgodność z MEiN** - Średni procent realizacji
- **Braki godzin** - Liczba przedmiotów z brakami
- **Średnie obciążenie** - Średnie obciążenie nauczycieli
- **Braki kadrowe** - Liczba przedmiotów bez nauczycieli

### 2. Zgodność z MEiN

- Wykres kołowy pokazujący rozkład statusów
- Statystyki (zgodne, z brakami, z nadwyżkami)
- Tabela 10 najgorszych przedmiotów (najniższy procent realizacji)

### 3. Obciążenie nauczycieli

- Statystyki (przekroczone, pełne, niskie)
- Tabela wszystkich nauczycieli z:
  - Obciążeniem (aktualne/maksymalne)
  - Procentem wykorzystania (pasek postępu)
  - Dostępnym obciążeniem
  - Liczbą przypisań
  - Statusem (kolorowy badge)

### 4. Braki kadrowe

- Statystyki (łącznie, godziny, wymagane etaty)
- Grupowanie według przedmiotu
- Szczegółowa lista z sugerowanymi rozwiązaniami

## Użycie

### Podstawowe

```typescript
// Strona dashboardu automatycznie pobiera dane
// Wystarczy otworzyć /dashboard
```

### Z wyborem typu szkoły

```typescript
// W komponencie można dodać selektor typu szkoły
const [typSzkolyId, setTypSzkolyId] = useState('');

// Dane będą pobierane dla wybranego typu szkoły
```

## API Responses

### `/api/dashboard/podsumowanie`

```json
{
  "zgodnoscMein": {
    "lacznie": 50,
    "zgodne": 40,
    "zBrakami": 8,
    "zNadwyzkami": 2,
    "sredniProcent": 95.5
  },
  "obciazenia": {
    "lacznie": 25,
    "przekroczone": 2,
    "pelne": 5,
    "niskie": 3,
    "srednieObciazenie": 15.2
  },
  "brakiKadrowe": {
    "lacznie": 3,
    "laczneGodziny": 12,
    "wymaganeEtaty": 1
  }
}
```

### `/api/dashboard/zgodnosc-mein`

```json
{
  "wyniki": [
    {
      "przedmiotNazwa": "Język polski",
      "klasaNazwa": "1A",
      "roznica": {
        "procent_realizacji": 88.5,
        "godziny": -20
      },
      "status": "BRAK"
    }
  ],
  "statystyki": {
    "lacznie": 50,
    "zgodne": 40,
    "zBrakami": 8,
    "zNadwyzkami": 2,
    "sredniProcent": 95.5
  }
}
```

### `/api/dashboard/obciazenie-nauczycieli`

```json
{
  "obciazenia": [
    {
      "nauczycielId": "123",
      "nauczycielNazwa": "Jan Kowalski",
      "maxObciazenie": 18,
      "aktualneObciazenie": 16,
      "dostepneObciazenie": 2,
      "procentWykorzystania": 88.9,
      "status": "OK",
      "liczbaPrzypisan": 5
    }
  ],
  "statystyki": {
    "lacznie": 25,
    "przekroczone": 2,
    "pelne": 5,
    "niskie": 3,
    "srednieObciazenie": 15.2
  }
}
```

### `/api/dashboard/braki-kadrowe`

```json
{
  "braki": [
    {
      "przedmiotNazwa": "Matematyka",
      "klasaNazwa": "1A",
      "godzinyTygodniowo": 4,
      "powod": "Brak nauczycieli z dostępnym obciążeniem",
      "dostepniNauczyciele": 2,
      "sugerowaneRozwiazania": [
        "Zwiększ obciążenie istniejących nauczycieli",
        "Wymagane: 4 godziny tygodniowo"
      ]
    }
  ],
  "statystyki": {
    "lacznie": 3,
    "wedlugPrzedmiotu": [
      {
        "przedmiotNazwa": "Matematyka",
        "liczbaKlas": 2,
        "laczneGodziny": 8,
        "powod": "Brak nauczycieli z dostępnym obciążeniem",
        "dostepniNauczyciele": 2
      }
    ],
    "laczneGodziny": 12,
    "wymaganeEtaty": 1
  }
}
```

## Stylowanie

Dashboard używa Tailwind CSS (domyślnie w Next.js). Kolory:

- **Zielony** - OK, zgodne
- **Czerwony** - Braki, przekroczenia
- **Żółty** - Ostrzeżenia, nadwyżki
- **Niebieski** - Informacje, niskie obciążenia

## Rozszerzenia

### Możliwe ulepszenia:

1. **Filtrowanie** - Według klasy, przedmiotu, nauczyciela
2. **Eksport** - Do PDF/XLS
3. **Wykresy** - Użycie biblioteki (Chart.js, Recharts)
4. **Powiadomienia** - Email przy wykryciu problemów
5. **Historia** - Porównanie z poprzednimi latami
6. **Drukowanie** - Wersja do druku

### Integracja z shadcn/ui

Aby użyć shadcn/ui, zainstaluj:

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add card table badge
```

Następnie zaktualizuj komponenty, aby używały komponentów shadcn/ui.

---

**Pliki:**
- API: `src/app/api/dashboard/**/route.ts`
- Komponenty: `src/components/dashboard/*.tsx`
- Strona: `src/app/dashboard/page.tsx`
