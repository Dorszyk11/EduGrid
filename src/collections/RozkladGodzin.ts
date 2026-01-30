import { CollectionConfig } from "payload";

export const RozkladGodzin: CollectionConfig = {
  slug: "rozkład-godzin",
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "przedmiot",
      "klasa",
      "nauczyciel",
      "rok_szkolny",
      "godziny_roczne",
      "godziny_tyg",
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
        description: "Przedmiot realizowany w klasie",
      },
    },
    {
      name: "klasa",
      type: "relationship",
      relationTo: "klasy",
      required: true,
      label: "Klasa",
      admin: {
        description: "Klasa, w której realizowany jest przedmiot",
      },
    },
    {
      name: "nauczyciel",
      type: "relationship",
      relationTo: "nauczyciele",
      required: true,
      label: "Nauczyciel",
      admin: {
        description: "Nauczyciel prowadzący przedmiot",
      },
    },
    {
      name: "rok_szkolny",
      type: "text",
      required: true,
      label: "Rok szkolny",
      admin: {
        description: "Format: YYYY/YYYY (np. 2024/2025)",
      },
      validate: (value: any) => {
        if (!value) {
          return "Rok szkolny jest wymagany";
        }
        const pattern = /^\d{4}\/\d{4}$/;
        if (!pattern.test(value)) {
          return "Rok szkolny musi być w formacie YYYY/YYYY (np. 2024/2025)";
        }
        return true;
      },
    },
    {
      name: "godziny_roczne",
      type: "number",
      required: true,
      label: "Godziny roczne",
      min: 0,
      admin: {
        description: "Liczba godzin w roku szkolnym",
      },
      validate: (value: any) => {
        if (value < 0) {
          return "Liczba godzin nie może być ujemna";
        }
        return true;
      },
    },
    {
      name: "godziny_tyg",
      type: "number",
      required: true,
      label: "Godziny tygodniowo",
      min: 0,
      max: 10,
      admin: {
        description: "Średnia liczba godzin tygodniowo",
      },
      validate: (value: any) => {
        if (value < 0 || value > 10) {
          return "Godziny tygodniowo muszą być między 0 a 10";
        }
        return true;
      },
    },
    {
      name: "semestr_1",
      type: "number",
      required: true,
      label: "Godziny w semestrze 1",
      min: 0,
      admin: {
        description: "Liczba godzin w pierwszym semestrze",
      },
    },
    {
      name: "semestr_2",
      type: "number",
      required: true,
      label: "Godziny w semestrze 2",
      min: 0,
      admin: {
        description: "Liczba godzin w drugim semestrze",
      },
    },
    {
      name: "typ_zajec",
      type: "select",
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
        description: "Typ zajęć (kopiowane z przedmiotu)",
      },
    },
    {
      name: "poziom",
      type: "select",
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
        description: "Poziom przedmiotu (kopiowane z przedmiotu)",
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
    {
      name: "uzasadnienie_nadwyzki",
      type: "textarea",
      label: "Uzasadnienie nadwyżki",
      admin: {
        description:
          "Uzasadnienie dlaczego nadwyżka godzin jest akceptowalna (ważne przy audycie)",
        condition: (data: any) => {
          // Pokaż tylko jeśli są nadwyżki (można dodać logikę sprawdzającą zgodność MEiN)
          return true;
        },
      },
    },
    {
      name: "notatki",
      type: "textarea",
      label: "Notatki",
      admin: {
        description: "Dodatkowe notatki dotyczące tego przypisania",
      },
    },
    {
      name: "zablokowane",
      type: "checkbox",
      label: "Zablokowane",
      defaultValue: false,
      admin: {
        description:
          "Czy przydział jest zablokowany (nie będzie zmieniany przez generator)",
      },
    },
    {
      name: "powod_blokady",
      type: "text",
      label: "Powód blokady",
      admin: {
        condition: (data: any) => data.zablokowane === true,
        description: "Uzasadnienie blokady przydziału",
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeValidate: [
      ({ data }: { data?: any }) => {
        // Walidacja: godziny_roczne = semestr_1 + semestr_2
        if (
          data &&
          data.semestr_1 !== undefined &&
          data.semestr_2 !== undefined
        ) {
          const suma = data.semestr_1 + data.semestr_2;
          if (
            data.godziny_roczne !== undefined &&
            data.godziny_roczne !== suma
          ) {
            throw new Error(
              `Godziny roczne (${data.godziny_roczne}) muszą być równe sumie semestrów (${suma})`
            );
          }
          // Automatyczne ustawienie godzin rocznych, jeśli nie podano
          if (data.godziny_roczne === undefined) {
            data.godziny_roczne = suma;
          }
        }
        return data;
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        // Kopiowanie typ_zajec i poziom z przedmiotu
        if (data.przedmiot) {
          const przedmiot = await req.payload.findByID({
            collection: "przedmioty",
            id:
              typeof data.przedmiot === "string"
                ? data.przedmiot
                : data.przedmiot.id,
          });

          if (przedmiot) {
            data.typ_zajec = przedmiot.typ_zajec;
            data.poziom = przedmiot.poziom;
          }
        }

        // Sprawdzenie kwalifikacji nauczyciela
        if (data.nauczyciel && data.przedmiot) {
          const nauczycielId =
            typeof data.nauczyciel === "string"
              ? data.nauczyciel
              : data.nauczyciel.id;
          const przedmiotId =
            typeof data.przedmiot === "string"
              ? data.przedmiot
              : data.przedmiot.id;

          const kwalifikacje = await req.payload.find({
            collection: "kwalifikacje",
            where: {
              and: [
                {
                  nauczyciel: {
                    equals: nauczycielId,
                  },
                },
                {
                  przedmiot: {
                    equals: przedmiotId,
                  },
                },
                {
                  aktywne: {
                    equals: true,
                  },
                },
              ],
            },
            limit: 1,
          });

          if (kwalifikacje.docs.length === 0) {
            // Ostrzeżenie, ale nie blokujemy (można zmienić na throw new Error)
            console.warn(`Nauczyciel nie ma kwalifikacji do przedmiotu`);
          }
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        // Sprawdzenie obciążenia nauczyciela po zmianie
        if (doc.nauczyciel) {
          const nauczycielId =
            typeof doc.nauczyciel === "string"
              ? doc.nauczyciel
              : doc.nauczyciel.id;

          const rozklady = await req.payload.find({
            collection: "rozkład-godzin",
            where: {
              and: [
                {
                  nauczyciel: {
                    equals: nauczycielId,
                  },
                },
                {
                  rok_szkolny: {
                    equals: doc.rok_szkolny,
                  },
                },
              ],
            },
          });

          const sumaGodzin = rozklady.docs.reduce(
            (sum, r) => sum + (r.godziny_tyg || 0),
            0
          );

          const nauczyciel = await req.payload.findByID({
            collection: "nauczyciele",
            id: nauczycielId,
          });

          if (nauczyciel && sumaGodzin > nauczyciel.max_obciazenie) {
            console.warn(
              `UWAGA: Nauczyciel przekroczył maksymalne obciążenie! Aktualne: ${sumaGodzin}, Maksymalne: ${nauczyciel.max_obciazenie}`
            );
          }
        }
      },
    ],
  },
};
