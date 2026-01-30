import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "role",
      type: "select",
      options: [
        {
          label: "Administrator",
          value: "admin",
        },
        {
          label: "Dyrektor",
          value: "dyrektor",
        },
        {
          label: "Sekretariat",
          value: "sekretariat",
        },
      ],
      defaultValue: "sekretariat",
      required: true,
    },
  ],
};
