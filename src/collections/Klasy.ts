import { CollectionConfig } from 'payload/types';

export const Klasy: CollectionConfig = {
  slug: 'klasy',
  admin: {
    useAsTitle: 'nazwa',
    defaultColumns: ['nazwa', 'typ_szkoly', 'rok_szkolny', 'numer_klasy', 'aktywna', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'nazwa',
      type: 'text',
      required: true,
      label: 'Nazwa klasy',
      admin: {
        description: 'Np. 1A, 2B, 3C',
      },
      validate: (value) => {
        if (!value || value.length < 1) {
          return 'Nazwa klasy jest wymagana';
        }
        return true;
      },
    },
    {
      name: 'typ_szkoly',
      type: 'relationship',
      relationTo: 'typy-szkol',
      required: true,
      label: 'Typ szkoły',
      admin: {
        description: 'Typ szkoły, do której należy klasa',
      },
    },
    {
      name: 'rok_szkolny',
      type: 'text',
      required: true,
      label: 'Rok szkolny',
      admin: {
        description: 'Format: YYYY/YYYY (np. 2024/2025)',
      },
      validate: (value) => {
        if (!value) {
          return 'Rok szkolny jest wymagany';
        }
        const pattern = /^\d{4}\/\d{4}$/;
        if (!pattern.test(value)) {
          return 'Rok szkolny musi być w formacie YYYY/YYYY (np. 2024/2025)';
        }
        return true;
      },
    },
    {
      name: 'numer_klasy',
      type: 'number',
      required: true,
      label: 'Numer klasy w cyklu',
      min: 1,
      max: 8,
      admin: {
        description: 'Numer klasy w cyklu kształcenia (1, 2, 3, ...)',
      },
    },
    {
      name: 'profil',
      type: 'text',
      label: 'Profil klasy',
      admin: {
        description: 'Np. matematyczno-fizyczny, humanistyczny (opcjonalnie)',
      },
    },
    {
      name: 'zawod',
      type: 'relationship',
      relationTo: 'zawody',
      label: 'Zawód',
      admin: {
        description: 'Zawód dla szkół zawodowych (opcjonalnie)',
        condition: (data) => {
          // Logika warunkowa - można dodać później
          return true;
        },
      },
    },
    {
      name: 'aktywna',
      type: 'checkbox',
      label: 'Aktywna',
      defaultValue: true,
      admin: {
        description: 'Czy klasa jest aktywna w systemie',
      },
    },
  ],
  timestamps: true,
};
