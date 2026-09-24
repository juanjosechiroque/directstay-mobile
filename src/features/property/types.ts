/**
 * Property & unit domain types.
 *
 * These types are intentionally independent from React Native, Supabase and Stripe.
 * Demo content (names, descriptions) is data, not translation copy.
 *
 * Private stay data (Wi-Fi, arrival instructions) is deliberately NOT part of `Property`:
 * the public catalog read model must never carry it. It lives in the stay feature and is
 * fetched through the authenticated, CONFIRMED-only stay RPC.
 */

export const AMENITY_CODES = [
  'wifi',
  'breakfast',
  'private_bathroom',
  'fireplace',
  'mountain_view',
  'terrace',
  'heating',
  'free_parking',
  'kitchenette',
  'family_friendly',
] as const;

export type AmenityCode = (typeof AMENITY_CODES)[number];

export const HIGHLIGHT_CODES = [
  'mountain_view',
  'local_hosts',
  'breakfast_included',
  'direct_booking',
  'nature',
] as const;

export type HighlightCode = (typeof HIGHLIGHT_CODES)[number];

/**
 * Catalog image. `url` is a resolved public URL when a real asset exists; when it is
 * `null` the UI renders a deterministic local placeholder (no unverified asset is ever
 * presented as licensed). `altText` is localized by the read model.
 */
export interface CatalogImage {
  id: string;
  url: string | null;
  altText: string | null;
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
  images: CatalogImage[];
}

/** Public business contact for a property. Never guest PII. */
export interface PropertyContact {
  whatsapp: string | null;
  phone: string | null;
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  locationLabel: string;
  mapReference: string | null;
  mapLatitude: number | null;
  mapLongitude: number | null;
  shortDescription: string;
  description: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  highlights: HighlightCode[];
  heroImage: CatalogImage | null;
  contact: PropertyContact;
}

/** A property together with its public, active units, as returned by the catalog RPC. */
export interface PropertyCatalog {
  property: Property;
  units: Unit[];
}
