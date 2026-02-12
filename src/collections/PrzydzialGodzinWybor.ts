import type { CollectionConfig } from "payload";

/**
 * Zapis przydziału "godzin do wyboru" (z planów MEiN) oraz zrealizowanych godzin doradztwa zawodowego
 * dla danej klasy. Jedna rekord na klasę (unique klasa).
 * przydzial: { "planId_Przedmiot": { "IV": 2, "V": 1 }, ... }
 * doradztwo: { "planId_Zajęcia z zakresu doradztwa zawodowego": { "IV": 1, "V": 2 }, ... }
 */
export const PrzydzialGodzinWybor: CollectionConfig = {
  slug: 'przydzial-godzin-wybor',
  admin: {
    useAsTitle: 'klasa',
    defaultColumns: ['klasa', 'updatedAt'],
    description: 'Przydział godzin do wyboru (MEiN) i zrealizowane godziny doradztwa zawodowego per klasa',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'klasa',
      type: 'relationship',
      relationTo: 'klasy',
      required: true,
      unique: true,
      label: 'Klasa',
      admin: {
        description: 'Klasa, dla której zapisano wybory godzin',
      },
    },
    {
      name: 'przydzial',
      type: 'json',
      required: false,
      label: 'Przydział godzin do wyboru',
      admin: {
        description: 'Obiekt: klucz = planId_Przedmiot, wartość = { klasa/rok: liczba godzin }',
      },
    },
    {
      name: 'doradztwo',
      type: 'json',
      required: false,
      label: 'Zrealizowane godziny doradztwa zawodowego',
      admin: {
        description: 'Obiekt: klucz = planId_Przedmiot, wartość = { klasa/rok: liczba zrealizowanych godzin }',
      },
    },
    {
      name: 'dyrektor',
      type: 'json',
      required: false,
      label: 'Godziny dyrektorskie przypisane do przedmiotów',
      admin: {
        description: 'Obiekt: klucz = planId_Przedmiot, wartość = { klasa/rok: liczba godzin z puli dyrektorskiej }',
      },
    },
    {
      name: 'rozszerzenia',
      type: 'json',
      required: false,
      label: 'Przedmioty z rozszerzeniem',
      admin: {
        description: 'Tablica kluczy przedmiotów oznaczonych jako rozszerzenie (planId_Przedmiot)',
      },
    },
    {
      name: 'rozszerzeniaGodziny',
      type: 'json',
      required: false,
      label: 'Pula godzin rozszerzeń (łącznie)',
      admin: {
        description: 'Obiekt: rocznik -> liczba godzin (np. { "I": 1, "II": 1, "III": 2 }) – liczy się we wszystkich przedmiotach rozszerzonych',
      },
    },
    {
      name: 'rozszerzeniaPrzydzial',
      type: 'json',
      required: false,
      label: 'Godziny rozszerzeń per przedmiot',
      admin: {
        description: 'Obiekt: subKey (planId_Przedmiot) -> { rocznik: liczba }. Przy odznaczeniu przedmiotu jego godziny są usuwane z puli.',
      },
    },
    {
      name: 'realizacja',
      type: 'json',
      required: false,
      label: 'Realizacja godzin (moduł Realizacja)',
      admin: {
        description: 'Obiekt: planId_Przedmiot -> { rok (I, II, …): zrealizowane godziny }. Zapis z zakładki Realizacja.',
      },
    },
    {
      name: 'podzial_na_grupy',
      type: 'json',
      required: false,
      label: 'Podział na grupy (grupa 1 i 2)',
      admin: {
        description: 'Obiekt: planId_Przedmiot -> { rocznik: true }. Komórki z true wyświetlane jako połowa | połowa.',
      },
    },
    {
      name: 'przydzial_grupy',
      type: 'json',
      required: false,
      label: 'Przydział godzin per grupa (gdy podział włączony)',
      admin: {
        description: 'Obiekt: planId_Przedmiot -> { rocznik: { "1": godz. grupa 1, "2": godz. grupa 2 } }. Tylko dla roczników z włączonym podziałem.',
      },
    },
    {
      name: 'dyrektor_grupy',
      type: 'json',
      required: false,
      label: 'Godziny dyrektorskie per grupa (gdy podział włączony)',
      admin: {
        description: 'Obiekt: planId_Przedmiot -> { rocznik: { "1": godz. grupa 1, "2": godz. grupa 2 } }. Tylko dla roczników z podziałem.',
      },
    },
  ],
  timestamps: true,
};
