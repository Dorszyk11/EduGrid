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
      "wlasciciel",
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
    // Where-based (jak read): operacja dotyczy wyłącznie rekordów właściciela
    // (+ legacy bez właściciela) na poziomie DB — bez tego delete bez body
    // dawał pełny dostęp do cudzych rekordów po ID (audyt [8]).
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
        description: "Konto, które utworzyło klasę – tylko ono może ją edytować i usunąć.",
        readOnly: true,
      },
    },
    {
      name: "nazwa",
      type: "text",
      required: true,
      label: "Nazwa klasy",
      admin: {
        description: "Np. A, B, C (litera oddziału)",
      },
      validate: (value: string | null | undefined) => {
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
      validate: (value: string | null | undefined) => {
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
