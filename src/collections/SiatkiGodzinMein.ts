import { CollectionConfig } from "payload";

export const SiatkiGodzinMein: CollectionConfig = {
  slug: "siatki-godzin-mein",
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "przedmiot",
      "typ_szkoly",
      "klasa",
      "godziny_w_cyklu",
      "obowiazkowe",
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
      name: "przedmiot",
      type: "relationship",
      relationTo: "przedmioty",
      required: true,
      label: "Przedmiot",
      admin: {
        description: "Przedmiot, dla którego określono wymagania",
      },
    },
    {
      name: "typ_szkoly",
      type: "relationship",
      relationTo: "typy-szkol",
      required: true,
      label: "Typ szkoły",
      admin: {
        description: "Typ szkoły, dla którego obowiązują wymagania",
      },
    },
    {
      name: "klasa",
      type: "number",
      label: "Numer klasy",
      min: 1,
      max: 8,
      admin: {
        description: "Numer klasy (pozostaw puste dla całego cyklu)",
      },
    },
    {
      name: "godziny_w_cyklu",
      type: "number",
      required: true,
      label: "Godziny w cyklu",
      min: 0,
      admin: {
        description: "Wymagana liczba godzin w całym cyklu kształcenia",
      },
      validate: (value: any) => {
        if (value < 0) {
          return "Liczba godzin nie może być ujemna";
        }
        return true;
      },
    },
    {
      name: "godziny_tygodniowo_min",
      type: "number",
      label: "Minimalne godziny tygodniowo",
      min: 0,
      admin: {
        description: "Minimalna liczba godzin tygodniowo (opcjonalnie)",
      },
    },
    {
      name: "godziny_tygodniowo_max",
      type: "number",
      label: "Maksymalne godziny tygodniowo",
      min: 0,
      admin: {
        description: "Maksymalna liczba godzin tygodniowo (opcjonalnie)",
      },
    },
    {
      name: "obowiazkowe",
      type: "checkbox",
      label: "Obowiązkowe",
      defaultValue: true,
      admin: {
        description: "Czy przedmiot jest obowiązkowy",
      },
    },
    {
      name: "data_obowiazywania_od",
      type: "date",
      required: true,
      label: "Obowiązuje od",
      defaultValue: () => new Date().toISOString().split("T")[0],
      admin: {
        description: "Data, od której obowiązują wymagania",
      },
    },
    {
      name: "data_obowiazywania_do",
      type: "date",
      label: "Obowiązuje do",
      admin: {
        description:
          "Data, do której obowiązują wymagania (pozostaw puste, jeśli nadal obowiązują)",
      },
    },
    {
      name: "uwagi",
      type: "textarea",
      label: "Uwagi",
      admin: {
        description: "Dodatkowe uwagi (opcjonalnie)",
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeValidate: [
      ({ data }: { data?: any }) => {
        // Walidacja: jeśli podano max, to min nie może być większe
        if (
          data &&
          data.godziny_tygodniowo_min &&
          data.godziny_tygodniowo_max
        ) {
          if (data.godziny_tygodniowo_min > data.godziny_tygodniowo_max) {
            throw new Error(
              "Minimalne godziny tygodniowo nie mogą być większe od maksymalnych"
            );
          }
        }
        return data;
      },
    ],
  },
};
