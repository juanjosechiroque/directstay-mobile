import type { Booking, BookingStatus, CancellationReason } from '@/features/booking/types';
import {
  AMENITY_CODES,
  HIGHLIGHT_CODES,
  type AmenityCode,
  type CatalogImage,
  type HighlightCode,
  type PropertyCatalog,
  type Property,
  type Unit,
} from '@/features/property/types';
import type { AvailableUnit } from '@/features/search/types';
import type { StayInformation } from '@/features/stay/types';
import { diffInNights } from '@/lib/dates';
import { AppError } from '@/lib/errors';

import type {
  BookingRow,
  CatalogJson,
  CatalogMediaJson,
  CatalogPropertyJson,
  CatalogUnitJson,
  SearchUnitJson,
  StayInformationJson,
} from './types';

/**
 * Runtime mappers from Supabase payloads to domain models.
 *
 * They validate the untrusted shape (the Data API returns `unknown` JSON) and drop
 * unknown amenity/highlight codes, so a bad row never reaches the UI as a translation
 * key or a crash. They are pure functions, easy to unit test with fixture payloads.
 */

const AMENITY_SET = new Set<string>(AMENITY_CODES);
const HIGHLIGHT_SET = new Set<string>(HIGHLIGHT_CODES);
const BOOKING_STATUSES: readonly BookingStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELED',
  'REFUNDED',
];
const CANCELLATION_REASONS: readonly CancellationReason[] = [
  'HOLD_EXPIRED',
  'USER_CANCELLED',
  'SYSTEM',
];

const BOOKING_STATUS_SET = new Set<string>(BOOKING_STATUSES);
const CANCELLATION_REASON_SET = new Set<string>(CANCELLATION_REASONS);

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Money must never be invented: an invalid amount is a contract violation, not a zero.
 * Throws the same typed error as `mapBookingRpcResponse` so callers render an error state.
 */
function requireMinorUnits(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new AppError('error.generic');
  }
  return value;
}

function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && BOOKING_STATUS_SET.has(value);
}

/** A booking status is authoritative: an unknown value is an error, never a default. */
function toBookingStatus(value: unknown): BookingStatus {
  if (!isBookingStatus(value)) {
    throw new AppError('error.generic');
  }
  return value;
}

function isCancellationReason(value: unknown): value is CancellationReason {
  return typeof value === 'string' && CANCELLATION_REASON_SET.has(value);
}

function toCancellationReason(value: unknown): CancellationReason | null {
  return isCancellationReason(value) ? value : null;
}

export function mapCatalogImage(
  json: CatalogMediaJson,
  resolveMediaUrl: (storagePath: string) => string,
): CatalogImage {
  const storagePath = asString(json.storagePath);
  return {
    id: asString(json.id) ?? '',
    url: storagePath ? resolveMediaUrl(storagePath) : null,
    altText: asString(json.altText),
  };
}

export function mapUnit(
  json: CatalogUnitJson,
  resolveMediaUrl: (storagePath: string) => string,
): Unit {
  return {
    id: asString(json.id) ?? '',
    propertyId: asString(json.propertyId) ?? '',
    name: asString(json.name) ?? '',
    slug: asString(json.slug) ?? '',
    summary: asString(json.summary) ?? '',
    description: asString(json.description) ?? '',
    maxGuests: asNumber(json.maxGuests),
    nightlyRateMinor: requireMinorUnits(json.nightlyRateMinor),
    currency: asString(json.currency) ?? 'USD',
    amenities: asArray(json.amenities).filter(
      (code): code is AmenityCode => typeof code === 'string' && AMENITY_SET.has(code),
    ),
    images: asArray(json.images).map((image) =>
      mapCatalogImage(image as CatalogMediaJson, resolveMediaUrl),
    ),
  };
}

export function mapProperty(
  json: CatalogPropertyJson,
  resolveMediaUrl: (storagePath: string) => string,
): Property {
  const images = asArray(json.images).map((image) =>
    mapCatalogImage(image as CatalogMediaJson, resolveMediaUrl),
  );
  return {
    id: asString(json.id) ?? '',
    name: asString(json.name) ?? '',
    slug: asString(json.slug) ?? '',
    locationLabel: asString(json.locationLabel) ?? '',
    mapReference: asString(json.mapReference),
    mapLatitude: asFiniteNumber(json.mapLatitude),
    mapLongitude: asFiniteNumber(json.mapLongitude),
    shortDescription: asString(json.shortDescription) ?? '',
    description: asString(json.description) ?? '',
    timezone: asString(json.timezone) ?? 'UTC',
    checkInTime: normalizeTime(json.checkInTime),
    checkOutTime: normalizeTime(json.checkOutTime),
    currency: asString(json.currency) ?? 'USD',
    highlights: asArray(json.highlights).filter(
      (code): code is HighlightCode => typeof code === 'string' && HIGHLIGHT_SET.has(code),
    ),
    heroImage: images[0] ?? null,
    contact: {
      whatsapp: asString(json.contactWhatsapp),
      phone: asString(json.contactPhone),
    },
  };
}

function normalizeTime(value: unknown): string {
  const time = asString(value) ?? '00:00';
  return time.slice(0, 5);
}

export function mapCatalog(
  json: CatalogJson,
  resolveMediaUrl: (storagePath: string) => string,
): PropertyCatalog[] {
  return asArray(json?.properties).map((property) => {
    const propertyJson = property as CatalogPropertyJson;
    return {
      property: mapProperty(propertyJson, resolveMediaUrl),
      units: asArray(propertyJson.units).map((unit) =>
        mapUnit(unit as CatalogUnitJson, resolveMediaUrl),
      ),
    };
  });
}

export function mapSearchResult(
  json: SearchUnitJson,
  resolveMediaUrl: (storagePath: string) => string,
): AvailableUnit {
  return {
    unit: mapUnit(json.unit, resolveMediaUrl),
    propertyId: asString(json.property?.id) ?? asString(json.unit?.propertyId) ?? '',
    propertyName: asString(json.property?.name) ?? '',
    propertySlug: asString(json.property?.slug) ?? '',
    propertyTimezone: asString(json.property?.timezone) ?? 'UTC',
    nights: asNumber(json.nights),
    totalAmountMinor: requireMinorUnits(json.totalAmountMinor),
    currency: asString(json.currency) ?? asString(json.unit?.currency) ?? 'USD',
  };
}

export function mapBooking(row: BookingRow): Booking {
  const joinedUnit = row.units;
  const property = joinedUnit?.properties ?? null;
  return {
    id: row.id,
    guestProfileId: row.guest_profile_id,
    unitId: row.unit_id,
    unitName: joinedUnit?.name ?? '',
    propertyId: joinedUnit?.property_id ?? '',
    propertyName: property?.name ?? '',
    propertyTimezone: property?.timezone ?? 'UTC',
    propertyCheckInTime: normalizeTime(property?.check_in_time),
    propertyCheckOutTime: normalizeTime(property?.check_out_time),
    propertyWhatsapp: property?.contact_whatsapp ?? null,
    propertyPhone: property?.contact_phone ?? null,
    status: toBookingStatus(row.status),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: diffInNights(row.check_in, row.check_out),
    guestCount: row.guest_count,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    specialRequests: asString(row.special_requests),
    currency: row.currency,
    nightlyRateMinor: requireMinorUnits(row.nightly_rate_minor),
    totalAmountMinor: requireMinorUnits(row.total_amount_minor),
    holdExpiresAt: row.hold_expires_at,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    canceledAt: row.canceled_at,
    cancellationReason: toCancellationReason(row.cancellation_reason),
    refundedAt: row.refunded_at,
  };
}

/** Check the RPC payload before using its id or status for navigation. */
export function mapBookingRpcResponse(value: unknown): Booking {
  const row = value as BookingRow | null;
  if (
    !row ||
    typeof row.id !== 'string' ||
    !isBookingStatus(row.status) ||
    typeof row.check_in !== 'string' ||
    typeof row.check_out !== 'string' ||
    !Number.isSafeInteger(row.total_amount_minor) ||
    !Number.isSafeInteger(row.nightly_rate_minor) ||
    typeof row.hold_expires_at !== 'string'
  ) {
    throw new AppError('error.generic');
  }
  return mapBooking(row);
}

export function mapStayInformation(json: StayInformationJson): StayInformation {
  return {
    wifiNetwork: asString(json.wifiNetwork),
    wifiPassword: asString(json.wifiPassword),
    breakfastInfo: asString(json.breakfastInfo),
    checkinInstructions: asString(json.checkinInstructions),
    directions: asString(json.directions),
  };
}
