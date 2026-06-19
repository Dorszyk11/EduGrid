import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  access: {
    // Odczyt tylko własnego rekordu (anty-enumeracja e-maili). Trasy auth (login/register/me)
    // używają overrideAccess, więc ten zawężony read ich nie blokuje.
    read: ({ req }) => (req.user ? { id: { equals: req.user.id } } : false),
    create: () => true,
  },
  fields: [
    {
      name: "imie",
      type: "text",
      label: "Imię",
      required: true,
    },
    {
      name: "nazwisko",
      type: "text",
      label: "Nazwisko",
      required: true,
    },
    {
      name: "role",
      type: "select",
      label: "Rola",
      required: false,
      options: [
        { label: "Administrator", value: "admin" },
        { label: "Dyrektor", value: "dyrektor" },
        { label: "Sekretariat", value: "sekretariat" },
      ],
      defaultValue: "sekretariat",
      admin: { description: "Opcjonalne; domyślnie sekretariat." },
    },
  ],
};
