import type { Property } from '@/features/property/types';

/**
 * DEMO / MOCK DATA ONLY.
 *
 * Ayni Mountain Cabins is fictional reference data for screenshots, demos and tests. It
 * lives here and must never be reused as reusable domain logic. Values mirror
 * `supabase/seed.sql` (timezone America/Lima, check-in 15:00, check-out 12:00, USD).
 */

export const ORGANIZATION_ID = '11111111-1111-1111-1111-111111111111';
export const PROPERTY_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_PROFILE_ID = '44444444-4444-4444-4444-444444444444';
export const OTHER_GUEST_PROFILE_ID = '44444444-4444-4444-4444-444444444445';

export const MOCK_PROPERTY: Property = {
  id: PROPERTY_ID,
  name: 'Ayni Mountain Cabins',
  slug: 'ayni-mountain-cabins',
  locationLabel: 'Valle Sagrado, Cusco, Perú',
  shortDescription:
    'Cabañas de montaña de gestión familiar, rodeadas de eucaliptos y frente a los Andes.',
  description:
    'Ayni Mountain Cabins es un pequeño refugio familiar en el Valle Sagrado. Cada cabaña se construyó con madera local y está pensada para descansar: chimenea, vistas a la montaña y silencio. Atendemos directamente a nuestros huéspedes, sin intermediarios.',
  timezone: 'America/Lima',
  checkInTime: '15:00',
  checkOutTime: '12:00',
  currency: 'USD',
  highlights: ['mountain_view', 'local_hosts', 'breakfast_included', 'direct_booking', 'nature'],
  heroImage: {
    id: 'ayni-hero',
    from: '#26453C',
    to: '#7C9A86',
  },
  wifi: {
    network: 'AyniGuest',
    password: 'valle-sagrado',
  },
  breakfast:
    'Desayuno andino con pan de maíz, frutas del valle y café de la selva, servido de 7:00 a 9:30 en el salón principal.',
  directions:
    'Estamos a 15 minutos de Urubamba por la carretera a Ollantaytambo, ingreso señalizado en el km 4. Coordinamos traslado privado desde el aeropuerto de Cusco.',
  contact: {
    whatsapp: '+51999000111',
    phone: '+51845550123',
  },
};
