/**
 * Row and RPC payload shapes returned by Supabase.
 *
 * The database read RPCs return JSON documents; these interfaces describe the exact shape
 * the adapters validate before mapping to domain models. They are deliberately narrow:
 * only the fields the app consumes, never raw private columns.
 */

export interface CatalogMediaJson {
  id: string;
  storagePath: string;
  altText: string | null;
}

export interface CatalogUnitJson {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  maxGuests: number;
  nightlyRateMinor: number;
  currency: string;
  summary: string | null;
  description: string | null;
  amenities: string[];
  images: CatalogMediaJson[];
}

export interface CatalogPropertyJson {
  id: string;
  name: string;
  slug: string;
  locationLabel: string | null;
  shortDescription: string | null;
  description: string | null;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  contactWhatsapp: string | null;
  contactPhone: string | null;
  highlights: string[];
  images: CatalogMediaJson[];
  units: CatalogUnitJson[];
}

export interface CatalogJson {
  organization: { id: string; name: string; slug: string };
  properties: CatalogPropertyJson[];
}

export interface SearchUnitJson {
  unit: CatalogUnitJson;
  property: { id: string; name: string; slug: string; timezone: string };
  nights: number;
  totalAmountMinor: number;
  currency: string;
}

export interface StayInformationJson {
  bookingId: string;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  breakfastInfo: string | null;
  checkinInstructions: string | null;
  directions: string | null;
}

interface JoinedPropertyRow {
  name: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  contact_whatsapp: string | null;
  contact_phone: string | null;
}

interface JoinedUnitRow {
  name: string;
  property_id: string;
  properties: JoinedPropertyRow | null;
}

export interface BookingRow {
  id: string;
  guest_profile_id: string;
  unit_id: string;
  status: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  currency: string;
  nightly_rate_minor: number;
  total_amount_minor: number;
  hold_expires_at: string;
  created_at: string;
  confirmed_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  refunded_at: string | null;
  units: JoinedUnitRow | null;
}
