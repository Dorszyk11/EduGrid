import { CollectionConfig } from 'payload/types';

export const MapowaniaNazw: CollectionConfig = {
  slug: 'mapowania-nazw',
  admin: {
    useAsTitle: 'nazwa_mein',
    defaultColumns: ['nazwa_mein', 'nazwa_szkola', 'typ', 'aktywne', 'updatedAt'],
    description: 'Mapowanie nazw z dokumentacji MEiN na nazwy używane w szkole',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'nazwa_mein',
      type: 'text',
      required: true,
      label: 'Nazwa w MEiN',
      admin: {
        description: 'Nazwa przedmiotu/typu szkoły w dokumentacji MEiN',
      },
    },
    {
      name: 'nazwa_szkola',
      type: 'text',
      required: true,
      label: 'Nazwa w szkole',
      admin: {
        description: 'Nazwa używana w szkole (powinna odpowiadać nazwie w bazie)',
      },
    },
    {
      name: 'typ',
      type: 'select',
      required: true,
      label: 'Typ mapowania',
      options: [
        {
          label: 'Przedmiot',
          value: 'przedmiot',
        },
        {
          label: 'Typ szkoły',
          value: 'typ_szkoly',
        },
      ],
      admin: {
        description: 'Czy mapowanie dotyczy przedmiotu czy typu szkoły',
      },
    },
    {
      name: 'przedmiot',
      type: 'relationship',
      relationTo: 'przedmioty',
      label: 'Przedmiot',
      admin: {
        condition: (data) => data.typ === 'przedmiot',
        description: 'Przedmiot w bazie (opcjonalnie, jeśli nazwa_szkola nie wystarczy)',
      },
    },
    {
      name: 'typ_szkoly',
      type: 'relationship',
      relationTo: 'typy-szkol',
      label: 'Typ szkoły',
      admin: {
        condition: (data) => data.typ === 'typ_szkoly',
        description: 'Typ szkoły w bazie (opcjonalnie)',
      },
    },
    {
      name: 'aktywne',
      type: 'checkbox',
      label: 'Aktywne',
      defaultValue: true,
      admin: {
        description: 'Czy mapowanie jest aktywne',
      },
    },
    {
      name: 'uwagi',
      type: 'textarea',
      label: 'Uwagi',
      admin: {
        description: 'Dodatkowe uwagi dotyczące mapowania',
      },
    },
  ],
  timestamps: true,
};
