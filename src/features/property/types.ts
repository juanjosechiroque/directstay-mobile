/**
 * Property & unit domain types.
 *
 * These types are intentionally independent from React Native, Supabase and Stripe so
 * they can travel between a mock repository and a future Supabase-backed adapter
 * without changes. Demo content (names, descriptions) is data, not translation copy.
 */

export type AmenityCode =
  | 'wifi'
  | 'breakfast'
  | 'private_bathroom'
  | 'fireplace'
  | 'mountain_view'
  | 'terrace'
  | 'heating'
  | 'free_parking'
  | 'kitchenette'
  | 'family_friendly';

export type HighlightCode =
  'mountain_view' | 'local_hosts' | 'breakfast_included' | 'direct_booking' | 'nature';

/**
 * Local/mock image placeholder. `from`/`to` are gradient stops rendered natively so the
 * app never depends on remote images. A future Supabase adapter maps `unit_images`
 * storage paths to these records.
 */
export interface UnitImage {
  id: string;
  from: string;
  to: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  maxGuests: number;
  nightlyRateMinor: number;
  currency: string;
  amenities: AmenityCode[];
  images: UnitImage[];
}

export interface PropertyWifi {
  network: string;
  password: string;
}

export interface PropertyContact {
  whatsapp: string;
  phone: string;
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  locationLabel: string;
  shortDescription: string;
  description: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  highlights: HighlightCode[];
  heroImage: UnitImage;
  wifi: PropertyWifi;
  breakfast: string;
  directions: string;
  contact: PropertyContact;
}
