import type { Unit } from '@/features/property/types';

import { PROPERTY_ID } from './property';

/**
 * DEMO / MOCK DATA ONLY — fictional Ayni Mountain Cabins units (Killa, Inti, Wayra,
 * Sumaq). Nightly rates match `supabase/seed.sql` and use integer USD minor units.
 */

export const KILLA_UNIT_ID = '33333333-3333-3333-3333-333333333301';
export const INTI_UNIT_ID = '33333333-3333-3333-3333-333333333302';
export const WAYRA_UNIT_ID = '33333333-3333-3333-3333-333333333303';
export const SUMAQ_UNIT_ID = '33333333-3333-3333-3333-333333333304';

export const MOCK_UNITS: Unit[] = [
  {
    id: KILLA_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Killa',
    slug: 'killa',
    summary: 'Cabaña íntima para dos, con chimenea y vista a la montaña.',
    description:
      'Killa es la cabaña más pequeña y luminosa. Tiene una cama queen, chimenea de leña y una ventana panorámica hacia el valle. Ideal para parejas que buscan silencio.',
    maxGuests: 2,
    nightlyRateMinor: 12000,
    currency: 'USD',
    amenities: ['wifi', 'fireplace', 'mountain_view', 'private_bathroom', 'heating'],
    images: [
      { id: 'killa-1', from: '#2F5D50', to: '#8FB39C' },
      { id: 'killa-2', from: '#26453C', to: '#6E8F7C' },
      { id: 'killa-3', from: '#3A5B4A', to: '#A8C3AE' },
    ],
  },
  {
    id: INTI_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Inti',
    slug: 'inti',
    summary: 'Cabaña familiar con cocina, terraza y espacio para cuatro.',
    description:
      'Inti mira hacia el este y recibe el sol de la mañana. Cuenta con dos habitaciones, cocina equipada y una terraza amplia con mesa de madera para compartir.',
    maxGuests: 4,
    nightlyRateMinor: 18000,
    currency: 'USD',
    amenities: ['wifi', 'kitchenette', 'terrace', 'private_bathroom', 'heating', 'family_friendly'],
    images: [
      { id: 'inti-1', from: '#B4713D', to: '#E8C69C' },
      { id: 'inti-2', from: '#9A5C2E', to: '#DDB484' },
      { id: 'inti-3', from: '#C58148', to: '#F0D4AE' },
    ],
  },
  {
    id: WAYRA_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Wayra',
    slug: 'wayra',
    summary: 'Refugio de tres plazas con chimenea y terraza al valle.',
    description:
      'Wayra está en el borde del terreno, donde corre el viento. Tiene cama matrimonial, sofá cama, chimenea y una terraza privada para ver el atardecer.',
    maxGuests: 3,
    nightlyRateMinor: 15000,
    currency: 'USD',
    amenities: ['wifi', 'fireplace', 'terrace', 'mountain_view', 'private_bathroom'],
    images: [
      { id: 'wayra-1', from: '#3C5A7A', to: '#A6BED6' },
      { id: 'wayra-2', from: '#2E4A66', to: '#8FA9C4' },
      { id: 'wayra-3', from: '#49688A', to: '#BCD2E5' },
    ],
  },
  {
    id: SUMAQ_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Sumaq',
    slug: 'sumaq',
    summary: 'Cabaña grande para grupos, con cocina y terraza panorámica.',
    description:
      'Sumaq es la cabaña más amplia: tres habitaciones, dos baños, cocina completa y una terraza con vista de 180° al Valle Sagrado. Pensada para familias y grupos.',
    maxGuests: 6,
    nightlyRateMinor: 26000,
    currency: 'USD',
    amenities: [
      'wifi',
      'kitchenette',
      'terrace',
      'mountain_view',
      'private_bathroom',
      'heating',
      'family_friendly',
    ],
    images: [
      { id: 'sumaq-1', from: '#5B4636', to: '#C9AC8C' },
      { id: 'sumaq-2', from: '#6E5540', to: '#D8BE9E' },
      { id: 'sumaq-3', from: '#4A3829', to: '#B99A78' },
    ],
  },
];

export function findMockUnit(unitId: string): Unit | undefined {
  return MOCK_UNITS.find((unit) => unit.id === unitId);
}
