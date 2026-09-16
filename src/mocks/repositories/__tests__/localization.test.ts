import type { Locale } from '@/lib/locale';

import { MockAvailabilityRepository } from '../availability-repository';
import { resetMockBookingStore } from '../booking-store';
import { MockPropertyRepository } from '../property-repository';
import { setMockLatencyEnabled, setMockScenario } from '../scenario';

const LOCALES: Locale[] = ['es', 'en'];

const property = new MockPropertyRepository();
const availability = new MockAvailabilityRepository();

beforeAll(() => {
  setMockLatencyEnabled(false);
});

beforeEach(() => {
  setMockScenario('success');
  resetMockBookingStore();
});

describe('localized mock catalog', () => {
  it('localizes property copy while keeping stable data', async () => {
    const [es, en] = await Promise.all(LOCALES.map((locale) => property.getProperty(locale)));

    expect(es.locationLabel).toContain('Valle Sagrado');
    expect(en.locationLabel).toContain('Sacred Valley');
    expect(es.breakfast).not.toBe(en.breakfast);
    expect(es.directions).not.toBe(en.directions);

    // Stable, locale-independent data must not change.
    expect(es.name).toBe(en.name);
    expect(es.timezone).toBe(en.timezone);
    expect(es.currency).toBe(en.currency);
  });

  it('localizes unit descriptions and summaries', async () => {
    const esUnits = await property.listUnits('es');
    const enUnits = await property.listUnits('en');

    expect(esUnits[0].summary).not.toBe(enUnits[0].summary);
    expect(esUnits[0].description).not.toBe(enUnits[0].description);
    // Unit names are proper nouns and stay identical.
    expect(esUnits.map((unit) => unit.name)).toEqual(enUnits.map((unit) => unit.name));
    // English copy must not leak the Spanish source text.
    expect(enUnits[0].summary).not.toMatch(/Cabaña/);
    expect(enUnits[1].description).not.toMatch(/cocina/);
  });

  it('localizes single-unit lookups', async () => {
    const es = await property.getUnit('33333333-3333-3333-3333-333333333301', 'es');
    const en = await property.getUnit('33333333-3333-3333-3333-333333333301', 'en');
    expect(es?.description).not.toBe(en?.description);
  });

  it('returns availability results already localized', async () => {
    const query = { checkIn: '2028-01-10', checkOut: '2028-01-13', guests: 2 };
    const es = await availability.searchAvailableUnits(query, 'es');
    const en = await availability.searchAvailableUnits(query, 'en');

    expect(es[0].unit.summary).not.toBe(en[0].unit.summary);
    expect(en[0].unit.summary).not.toMatch(/Cabaña/);
  });
});
