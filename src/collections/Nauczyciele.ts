import type { CollectionConfig } from "payload";

export const Nauczyciele: CollectionConfig = {
  slug: "nauczyciele",
  admin: {
    useAsTitle: "nazwisko",
    defaultColumns: [
      "imie",
      "nazwisko",
      "przedmioty",
      "email",
      "max_obciazenie",
      "etat",
      "aktywny",
      "updatedAt",
    ],
  },
  access: {
    read: ({ req }) => {
      if (!req.user?.id) return false;
      return {
        or: [
          { wlasciciel: { equals: req.user.id } },
          { wlasciciel: { exists: false } },
        ],
      };
    },
    create: ({ req }) => Boolean(req.user?.id),
    // Where-based (jak read): zapis/usuwanie tylko własnych rekordów (+ legacy
    // bez właściciela). Dawniej delete = każdy zalogowany (pełny dostęp do
    // cudzych nauczycieli), a update zależał od przychodzącego body (audyt [8]).
    update: ({ req }) => {
      if (!req.user?.id) return false;
      return {
        or: [
          { wlasciciel: { equals: req.user.id } },
          { wlasciciel: { exists: false } },
        ],
      };
    },
    delete: ({ req }) => {
      if (!req.user?.id) return false;
      return {
        or: [
          { wlasciciel: { equals: req.user.id } },
          { wlasciciel: { exists: false } },
        ],
      };
    },
  },
  fields: [
    {
      name: "wlasciciel",
      type: "relationship",
      relationTo: "users",
      required: false,
      label: "Właściciel (konto twórcy)",
      admin: {
        description:
          "Konto, które utworzyło nauczyciela – tylko ono go widzi, edytuje i usuwa.",
        readOnly: true,
      },
    },
    {
      name: "imie",
      type: "text",
      required: true,
      label: "Imię",
      admin: {
        description: "Imię nauczyciela",
      },
    },
    {
      name: "nazwisko",
      type: "text",
      required: true,
      label: "Nazwisko",
      admin: {
        description: "Nazwisko nauczyciela",
      },
    },
    {
      name: "przedmioty",
      type: "relationship",
      relationTo: "przedmioty",
      hasMany: true,
      label: "Specjalizacja",
      filterOptions: { aktywny: { equals: true } },
      admin: {
        description: "Przedmioty, których uczy nauczyciel.",
      },
    },
    {
      name: "email",
      type: "email",
      label: "Email",
      admin: {
        description: "Adres email nauczyciela",
      },
      validate: (value: any) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Nieprawidłowy format email";
        }
        return true;
      },
    },
    {
      name: "telefon",
      type: "text",
      label: "Telefon",
      admin: {
        description: "Numer telefonu (opcjonalnie)",
      },
    },
    {
      name: "max_obciazenie",
      type: "number",
      required: true,
      label: "Maksymalne obciążenie (godziny tygodniowo)",
      min: 0,
      max: 40,
      defaultValue: 18,
      admin: {
        description: "Maksymalna liczba godzin tygodniowo (pełny etat = 18)",
      },
      validate: (value: any) => {
        if (value < 0 || value > 40) {
          return "Obciążenie musi być między 0 a 40 godzin tygodniowo";
        }
        return true;
      },
    },
    {
      name: "etat",
      type: "select",
      required: true,
      label: "Wymiar etatu",
      options: [
        {
          label: "Pełny etat",
          value: "pelny",
        },
        {
          label: "Pół etatu",
          value: "pol",
        },
        {
          label: "1/4 etatu",
          value: "czwarty",
        },
        {
          label: "1/18 etatu",
          value: "osiemnasty",
        },
      ],
      defaultValue: "pelny",
      admin: {
        description: "Wymiar etatu nauczyciela",
      },
    },
    {
      name: "aktywny",
      type: "checkbox",
      label: "Aktywny",
      defaultValue: true,
      admin: {
        description: "Czy nauczyciel jest aktywny w systemie",
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Automatyczne ustawienie max_obciazenie na podstawie etatu
        if (operation === "create" || operation === "update") {
          const etatMap: Record<string, number> = {
            pelny: 18,
            pol: 9,
            czwarty: 4.5,
            osiemnasty: 1,
          };

          if (data.etat && !data.max_obciazenie) {
            data.max_obciazenie = etatMap[data.etat] || 18;
          }
        }
        return data;
      },
    ],
  },
};
