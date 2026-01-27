import { CollectionConfig } from 'payload/types';

export const TypySzkol: CollectionConfig = {
  slug: 'typy-szkol',
  admin: {
    useAsTitle: 'nazwa',
    defaultColumns: ['nazwa', 'liczba_lat', 'kod_mein', 'updatedAt'],
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
      label: 'Nazwa typu szkoły',
      admin: {
        description: 'Np. Liceum ogólnokształcące, Technikum',
      },
    },
    {
      name: 'liczba_lat',
      type: 'number',
      required: true,
      label: 'Liczba lat w cyklu',
      min: 1,
      max: 8,
      admin: {
        description: 'Długość cyklu kształcenia (np. 4 dla liceum, 5 dla technikum)',
      },
    },
    {
      name: 'kod_mein',
      type: 'text',
      required: true,
      unique: true,
      label: 'Kod MEiN',
      admin: {
        description: 'Kod w dokumentacji MEiN (np. LO, T, BS1)',
      },
    },
  ],
  timestamps: true,
};
