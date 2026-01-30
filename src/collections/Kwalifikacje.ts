import { CollectionConfig } from "payload";

export const Kwalifikacje: CollectionConfig = {
  slug: "kwalifikacje",
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "nauczyciel",
      "przedmiot",
      "stopien",
      "aktywne",
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
      name: "nauczyciel",
      type: "relationship",
      relationTo: "nauczyciele",
      required: true,
      label: "Nauczyciel",
      admin: {
        description: "Nauczyciel posiadający kwalifikacje",
      },
    },
    {
      name: "przedmiot",
      type: "relationship",
      relationTo: "przedmioty",
      required: true,
      label: "Przedmiot",
      admin: {
        description: "Przedmiot, do którego nauczyciel ma kwalifikacje",
      },
    },
    {
      name: "stopien",
      type: "text",
      label: "Stopień kwalifikacji",
      admin: {
        description: "Np. magister, doktor (opcjonalnie)",
      },
    },
    {
      name: "specjalizacja",
      type: "text",
      label: "Specjalizacja",
      admin: {
        description: "Specjalizacja (opcjonalnie)",
      },
    },
    {
      name: "data_uzyskania",
      type: "date",
      label: "Data uzyskania",
      admin: {
        description: "Data uzyskania kwalifikacji (opcjonalnie)",
      },
    },
    {
      name: "dokument",
      type: "text",
      label: "Numer dokumentu",
      admin: {
        description:
          "Numer dokumentu potwierdzającego kwalifikacje (opcjonalnie)",
      },
    },
    {
      name: "aktywne",
      type: "checkbox",
      label: "Aktywne",
      defaultValue: true,
      admin: {
        description: "Czy kwalifikacja jest aktywna",
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeValidate: [
      async ({ data, req }: { data?: any; req: any }) => {
        // Sprawdzenie, czy kombinacja nauczyciel + przedmiot już istnieje
        if (data && data.nauczyciel && data.przedmiot) {
          const existing = await req.payload.find({
            collection: "kwalifikacje",
            where: {
              and: [
                {
                  nauczyciel: {
                    equals: data.nauczyciel,
                  },
                },
                {
                  przedmiot: {
                    equals: data.przedmiot,
                  },
                },
              ],
            },
            limit: 1,
          });

          if (existing.docs.length > 0) {
            const existingId = existing.docs[0].id;
            // Jeśli to update tego samego rekordu, pozwól
            if (data.id && existingId === data.id) {
              return data;
            }
            throw new Error(
              "Ta kombinacja nauczyciel + przedmiot już istnieje"
            );
          }
        }
        return data;
      },
    ],
  },
};
