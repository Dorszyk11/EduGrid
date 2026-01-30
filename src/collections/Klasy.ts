import type { CollectionConfig } from "payload";

export const Klasy: CollectionConfig = {
  slug: "klasy",
  admin: {
    useAsTitle: "nazwa",
    defaultColumns: [
      "nazwa",
      "typ_szkoly",
      "rok_szkolny",
      "aktywna",
      "updatedAt",
    ],
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
      label: "Nazwa klasy",
      admin: {
        description: "Np. A, B, C (litera oddziału)",
      },
      validate: (value: any) => {
        if (!value || value.length < 1) {
          return "Nazwa klasy jest wymagana";
        }
        return true;
      },
    },
    {
      name: "typ_szkoly",
      type: "relationship",
      relationTo: "typy-szkol",
      required: true,
      label: "Typ szkoły",
      admin: {
        description: "Typ szkoły, do której należy klasa",
      },
    },
    {
      name: "rok_szkolny",
      type: "text",
      required: true,
      label: "Rok szkolny (zakres cyklu)",
      admin: {
        description:
          "Format: YYYY-YYYY (rok początku – rok końca cyklu, np. 2022-2027 dla technikum 5-letniego) lub YYYY/YYYY (pojedynczy rok)",
      },
      validate: (value: any) => {
        if (!value) {
          return "Rok szkolny jest wymagany";
        }
        const rangePattern = /^\d{4}-\d{4}$/;
        const singlePattern = /^\d{4}\/\d{4}$/;
        if (!rangePattern.test(value) && !singlePattern.test(value)) {
          return "Rok szkolny: YYYY-YYYY (zakres) lub YYYY/YYYY (pojedynczy)";
        }
        return true;
      },
    },
    {
      name: "numer_klasy",
      type: "number",
      required: false,
      label: "Numer klasy w cyklu (nieużywane)",
      min: 1,
      max: 8,
      admin: {
        description:
          "Zachowane dla kompatybilności – nie używane przy nowym modelu (zakres lat).",
      },
    },
    {
      name: "profil",
      type: "text",
      label: "Profil klasy",
      admin: {
        description: "Np. matematyczno-fizyczny, humanistyczny (opcjonalnie)",
      },
    },
    {
      name: "zawod",
      type: "relationship",
      relationTo: "zawody",
      label: "Zawód",
      admin: {
        description: "Zawód dla szkół zawodowych (opcjonalnie)",
        condition: (data: any) => {
          // Logika warunkowa - można dodać później
          return true;
        },
      },
    },
    {
      name: "aktywna",
      type: "checkbox",
      label: "Aktywna",
      defaultValue: true,
      admin: {
        description: "Czy klasa jest aktywna w systemie",
      },
    },
  ],
  timestamps: true,
};
