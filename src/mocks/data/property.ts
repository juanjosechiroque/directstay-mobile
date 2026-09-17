import type { Property } from '@/features/property/types';
import type { StayInformation } from '@/features/stay/types';
import type { Locale } from '@/lib/locale';

/**
 * DEMO / MOCK FIXTURE DATA (tests only).
 *
 * Ayni Mountain Cabins is fictional reference data for unit tests. It lives here and must
 * never be reused as reusable domain logic. This file is not part of the runtime
 * composition; the app reads the same shape from Supabase.
 */

export const ORGANIZATION_ID = '11111111-1111-1111-1111-111111111111';
export const PROPERTY_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_PROFILE_ID = '44444444-4444-4444-4444-444444444444';
export const OTHER_GUEST_PROFILE_ID = '44444444-4444-4444-4444-444444444445';

export interface PropertyLocalizedContent {
  locationLabel: string;
  shortDescription: string;
  description: string;
}

/** Locale-independent property fields (schedule, contact, media, highlights). */
export const MOCK_PROPERTY_BASE = {
  id: PROPERTY_ID,
  name: 'Ayni Mountain Cabins',
  slug: 'ayni-mountain-cabins',
  timezone: 'America/Lima',
  checkInTime: '15:00',
  checkOutTime: '12:00',
  currency: 'USD',
  highlights: ['mountain_view', 'local_hosts', 'breakfast_included', 'direct_booking', 'nature'],
  heroImage: {
    id: 'ayni-hero',
    url: null,
    altText: null,
  },
  contact: {
    whatsapp: '+51999000111',
    phone: '+51845550123',
  },
} satisfies Omit<Property, keyof PropertyLocalizedContent>;

const PROPERTY_CONTENT: Record<Locale, PropertyLocalizedContent> = {
  es: {
    locationLabel: 'Valle Sagrado, Cusco, Perú',
    shortDescription:
      'Cabañas de montaña de gestión familiar, rodeadas de eucaliptos y frente a los Andes.',
    description:
      'Ayni Mountain Cabins es un pequeño refugio familiar en el Valle Sagrado. Cada cabaña se construyó con madera local y está pensada para descansar: chimenea, vistas a la montaña y silencio. Atendemos directamente a nuestros huéspedes, sin intermediarios.',
  },
  en: {
    locationLabel: 'Sacred Valley, Cusco, Peru',
    shortDescription: 'Family-run mountain cabins surrounded by eucalyptus and facing the Andes.',
    description:
      'Ayni Mountain Cabins is a small family refuge in the Sacred Valley. Each cabin was built with local timber and designed for rest: fireplace, mountain views and quiet. We host our guests directly, with no intermediaries.',
  },
};

export function getMockProperty(locale: Locale): Property {
  return { ...MOCK_PROPERTY_BASE, ...PROPERTY_CONTENT[locale] };
}

/** Private stay fixture (tests only). Never rendered from the public catalog. */
export const MOCK_STAY_INFORMATION: StayInformation = {
  wifiNetwork: 'AyniGuest',
  wifiPassword: 'valle-sagrado',
  breakfastInfo:
    'Desayuno andino con pan de maíz, frutas del valle y café de la selva, servido de 7:00 a 9:30 en el salón principal.',
  checkinInstructions:
    'Al llegar, preséntate en la recepción del salón principal. Si llegas después de las 20:00, escríbenos por WhatsApp.',
  directions:
    'Estamos a 15 minutos de Urubamba por la carretera a Ollantaytambo, ingreso señalizado en el km 4.',
};
