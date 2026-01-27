# Scenariusze testowe - EduGrid

## Szybki start testowania

### 1. Wypełnij bazę danymi testowymi

```bash
npm install ts-node --save-dev
npm run seed
```

Lub ręcznie przez panel admin:
- Przejdź do `/admin`
- Dodaj dane zgodnie z `DANE_TESTOWE.md`

### 2. Uruchom scenariusze testowe

Wszystkie scenariusze są opisane w `DANE_TESTOWE.md`, sekcja 2.

---

## Checklist testowy - szybka weryfikacja

### ✅ Podstawowe funkcje
- [ ] Import PDF działa
- [ ] Dashboard ładuje się
- [ ] Typy szkół są widoczne
- [ ] Przedmioty są widoczne
- [ ] Nauczyciele są widoczne

### ✅ Funkcje zgodności MEiN
- [ ] Zgodność jest obliczana
- [ ] Braki są wykrywane
- [ ] Nadwyżki są wykrywane
- [ ] Procent realizacji jest poprawny

### ✅ Dashboard
- [ ] Karty z podsumowaniem działają
- [ ] Wykres zgodności działa
- [ ] Tabela obciążenia działa
- [ ] Lista braków działa

### ✅ Nawigacja
- [ ] Sidebar jest widoczny
- [ ] Linki działają
- [ ] Aktywna strona jest podświetlona

---

## Testy do wykonania przed wdrożeniem

1. **Test importu PDF** - wgraj przykładowy PDF i sprawdź, czy dane są poprawnie zaimportowane
2. **Test zgodności MEiN** - sprawdź, czy system poprawnie wykrywa braki i nadwyżki
3. **Test przypisania nauczycieli** - sprawdź walidację kwalifikacji
4. **Test automatycznego rozdziału** - sprawdź, czy algorytm wyrównuje obciążenie
5. **Test dashboardu** - sprawdź wszystkie sekcje i wykresy

---

**Gotowe do testowania!** 🧪
