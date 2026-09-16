import type { AmenityCode, Unit, UnitImage } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

import { PROPERTY_ID } from './property';

/**
 * DEMO / MOCK DATA ONLY — fictional Ayni Mountain Cabins units (Killa, Inti, Wayra,
 * Sumaq). Nightly rates match `supabase/seed.sql` and use integer USD minor units.
 * Unit names are proper nouns; the descriptive copy is localized per locale.
 */

export const KILLA_UNIT_ID = '33333333-3333-3333-3333-333333333301';
export const INTI_UNIT_ID = '33333333-3333-3333-3333-333333333302';
export const WAYRA_UNIT_ID = '33333333-3333-3333-3333-333333333303';
export const SUMAQ_UNIT_ID = '33333333-3333-3333-3333-333333333304';

export interface UnitLocalizedContent {
  summary: string;
  description: string;
}

export interface MockUnitSeed {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  maxGuests: number;
  nightlyRateMinor: number;
  currency: string;
  amenities: AmenityCode[];
  images: UnitImage[];
  content: Record<Locale, UnitLocalizedContent>;
}

export const MOCK_UNIT_SEEDS: MockUnitSeed[] = [
  {
    id: KILLA_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Killa',
    slug: 'killa',
    maxGuests: 2,
    nightlyRateMinor: 12000,
    currency: 'USD',
    amenities: ['wifi', 'fireplace', 'mountain_view', 'private_bathroom', 'heating'],
    images: [
      { id: 'killa-1', from: '#2F5D50', to: '#8FB39C' },
      { id: 'killa-2', from: '#26453C', to: '#6E8F7C' },
      { id: 'killa-3', from: '#3A5B4A', to: '#A8C3AE' },
    ],
    content: {
      es: {
        summary: 'Cabaña íntima para dos, con chimenea y vista a la montaña.',
        description:
          'Killa es la cabaña más pequeña y luminosa. Tiene una cama queen, chimenea de leña y una ventana panorámica hacia el valle. Ideal para parejas que buscan silencio.',
      },
      en: {
        summary: 'Intimate cabin for two, with a fireplace and mountain views.',
        description:
          'Killa is the smallest and brightest cabin. It has a queen bed, a wood fireplace and a panoramic window over the valley. Ideal for couples looking for quiet.',
      },
    },
  },
  {
    id: INTI_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Inti',
    slug: 'inti',
    maxGuests: 4,
    nightlyRateMinor: 18000,
    currency: 'USD',
    amenities: ['wifi', 'kitchenette', 'terrace', 'private_bathroom', 'heating', 'family_friendly'],
    images: [
      { id: 'inti-1', from: '#B4713D', to: '#E8C69C' },
      { id: 'inti-2', from: '#9A5C2E', to: '#DDB484' },
      { id: 'inti-3', from: '#C58148', to: '#F0D4AE' },
    ],
    content: {
      es: {
        summary: 'Cabaña familiar con cocina, terraza y espacio para cuatro.',
        description:
          'Inti mira hacia el este y recibe el sol de la mañana. Cuenta con dos habitaciones, cocina equipada y una terraza amplia con mesa de madera para compartir.',
      },
      en: {
        summary: 'Family cabin with a kitchen, terrace and room for four.',
        description:
          'Inti faces east and gets the morning sun. It has two bedrooms, a fitted kitchen and a wide terrace with a wooden table to share.',
      },
    },
  },
  {
    id: WAYRA_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Wayra',
    slug: 'wayra',
    maxGuests: 3,
    nightlyRateMinor: 15000,
    currency: 'USD',
    amenities: ['wifi', 'fireplace', 'terrace', 'mountain_view', 'private_bathroom'],
    images: [
      { id: 'wayra-1', from: '#3C5A7A', to: '#A6BED6' },
      { id: 'wayra-2', from: '#2E4A66', to: '#8FA9C4' },
      { id: 'wayra-3', from: '#49688A', to: '#BCD2E5' },
    ],
    content: {
      es: {
        summary: 'Refugio de tres plazas con chimenea y terraza al valle.',
        description:
          'Wayra está en el borde del terreno, donde corre el viento. Tiene cama matrimonial, sofá cama, chimenea y una terraza privada para ver el atardecer.',
      },
      en: {
        summary: 'Three-guest retreat with a fireplace and a terrace over the valley.',
        description:
          'Wayra sits at the edge of the land, where the wind blows. It has a double bed, a sofa bed, a fireplace and a private terrace to watch the sunset.',
      },
    },
  },
  {
    id: SUMAQ_UNIT_ID,
    propertyId: PROPERTY_ID,
    name: 'Sumaq',
    slug: 'sumaq',
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
    content: {
      es: {
        summary: 'Cabaña grande para grupos, con cocina y terraza panorámica.',
        description:
          'Sumaq es la cabaña más amplia: tres habitaciones, dos baños, cocina completa y una terraza con vista de 180° al Valle Sagrado. Pensada para familias y grupos.',
      },
      en: {
        summary: 'Large cabin for groups, with a kitchen and panoramic terrace.',
        description:
          'Sumaq is the largest cabin: three bedrooms, two bathrooms, a full kitchen and a terrace with 180° views of the Sacred Valley. Made for families and groups.',
      },
    },
  },
];

export function findMockUnitSeed(unitId: string): MockUnitSeed | undefined {
  return MOCK_UNIT_SEEDS.find((seed) => seed.id === unitId);
}

export function localizeUnit(seed: MockUnitSeed, locale: Locale): Unit {
  return {
    id: seed.id,
    propertyId: seed.propertyId,
    name: seed.name,
    slug: seed.slug,
    maxGuests: seed.maxGuests,
    nightlyRateMinor: seed.nightlyRateMinor,
    currency: seed.currency,
    amenities: seed.amenities,
    images: seed.images,
    ...seed.content[locale],
  };
}

export function getMockUnits(locale: Locale): Unit[] {
  return MOCK_UNIT_SEEDS.map((seed) => localizeUnit(seed, locale));
}

export function findMockUnit(unitId: string, locale: Locale): Unit | undefined {
  const seed = findMockUnitSeed(unitId);
  return seed ? localizeUnit(seed, locale) : undefined;
}
