import { CollectionConfig } from "payload";

export const Przedmioty: CollectionConfig = {
  slug: "przedmioty",
  admin: {
    useAsTitle: "nazwa",
    defaultColumns: ["nazwa", "typ_zajec", "poziom", "aktywny", "updatedAt"],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "nazwa",
      type: "text",
      required: true,
      label: "Nazwa przedmiotu",
      admin: {
        description: "Np. Język polski, Matematyka, Praktyka zawodowa",
      },
    },
    {
      name: "kod_mein",
      type: "text",
      label: "Kod MEiN",
      admin: {
        description: "Kod przedmiotu w dokumentacji MEiN (opcjonalnie)",
      },
    },
    {
      name: "typ_zajec",
      type: "select",
      required: true,
      label: "Typ zajęć",
      options: [
        {
          label: "Ogólnokształcące",
          value: "ogolnoksztalcace",
        },
        {
          label: "Zawodowe teoretyczne",
          value: "zawodowe_teoretyczne",
        },
        {
          label: "Zawodowe praktyczne",
          value: "zawodowe_praktyczne",
        },
      ],
      admin: {
        description: "Typ zajęć zgodnie z klasyfikacją MEiN",
      },
    },
    {
      name: "poziom",
      type: "select",
      required: true,
      label: "Poziom",
      options: [
        {
          label: "Podstawowy",
          value: "podstawowy",
        },
        {
          label: "Rozszerzony",
          value: "rozszerzony",
        },
        {
          label: "Brak podziału",
          value: "brak",
        },
      ],
      admin: {
        description: "Poziom przedmiotu (podstawowy/rozszerzony)",
      },
    },
    {
      name: "jednostka_org",
      type: "text",
      label: "Jednostka organizacyjna",
      admin: {
        description: "Np. Edukacja wczesnoszkolna (opcjonalnie)",
      },
    },
    {
      name: "aktywny",
      type: "checkbox",
      label: "Aktywny",
      defaultValue: true,
      admin: {
        description: "Czy przedmiot jest aktywny w systemie",
      },
    },
  ],
  timestamps: true,
};
