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
  ],
  timestamps: true,
};
