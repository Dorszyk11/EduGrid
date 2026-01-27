import { CollectionConfig } from 'payload/types';

export const Zawody: CollectionConfig = {
  slug: 'zawody',
  admin: {
    useAsTitle: 'nazwa',
    defaultColumns: ['nazwa', 'kod_zawodu', 'typ_szkoly', 'aktywny', 'updatedAt'],
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
      label: 'Nazwa zawodu',
      admin: {
        description: 'Np. Technik mechanik, Technik informatyk',
      },
    },
    {
      name: 'kod_zawodu',
      type: 'text',
      required: true,
      unique: true,
      label: 'Kod zawodu',
      admin: {
        description: 'Kod zawodu zgodny z klasyfikacją (np. 311504)',
      },
    },
    {
      name: 'typ_szkoly',
      type: 'relationship',
      relationTo: 'typy-szkol',
      required: true,
      label: 'Typ szkoły',
      admin: {
        description: 'Typ szkoły, w której realizowany jest zawód',
      },
    },
    {
      name: 'godziny_teor_w_cyklu',
      type: 'number',
      label: 'Godziny teoretyczne w cyklu',
      min: 0,
      admin: {
        description: 'Liczba godzin zajęć teoretycznych w całym cyklu',
      },
    },
    {
      name: 'godziny_prak_w_cyklu',
      type: 'number',
      label: 'Godziny praktyczne w cyklu',
      min: 0,
      admin: {
        description: 'Liczba godzin zajęć praktycznych w całym cyklu',
      },
    },
    {
      name: 'aktywny',
      type: 'checkbox',
      label: 'Aktywny',
      defaultValue: true,
      admin: {
        description: 'Czy zawód jest aktywny w systemie',
      },
    },
  ],
  timestamps: true,
};
