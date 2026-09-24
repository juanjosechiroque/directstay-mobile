import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { SearchScreen } from '@/features/search/screens/SearchScreen';
import type { AvailabilityQuery } from '@/features/search/types';
import { TEST_NOW, buildAvailableUnit, buildProperty, buildUnit } from '@/test/fixtures';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, router, setParams } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));

const catalog = [
  { property: buildProperty(), units: [buildUnit({ maxGuests: 4 })] },
  {
    property: buildProperty({
      id: 'property-2',
      name: 'Ayni Cusco',
      slug: 'ayni-cusco',
      locationLabel: 'Cusco',
    }),
    units: [buildUnit({ id: 'unit-2', propertyId: 'property-2', name: 'Sisa', maxGuests: 2 })],
  },
];

const MOUNTAIN = 'Ayni Mountain Cabins, Urubamba, Cusco';

function setup(searchUnits = jest.fn().mockResolvedValue([buildAvailableUnit()])) {
  const repositories = fakeRepositories({
    property: { getCatalog: jest.fn().mockResolvedValue(catalog) },
    availability: { searchAvailableUnits: searchUnits },
  });
  return { searchUnits, repositories };
}

async function pickDates(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('button', { name: /^Entrada: / }));
  await user.press(screen.getByRole('button', { name: 'martes, 20 de octubre de 2026' }));
  // Choosing check-in defaults check-out to the next day.
  await user.press(screen.getByRole('button', { name: /^Salida: / }));
  await user.press(screen.getByRole('button', { name: 'jueves, 22 de octubre de 2026' }));
}

describe('SearchScreen', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.useFakeTimers({ now: TEST_NOW });
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    resetRouter();
    setParams({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the catalog properties as radio options and marks the chosen one', async () => {
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    const mountain = await screen.findByRole('radio', { name: MOUNTAIN });
    expect(mountain).not.toBeChecked();
    await user.press(mountain);
    expect(screen.getByRole('radio', { name: MOUNTAIN })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Ayni Cusco, Cusco' })).not.toBeSelected();
  });

  it('asks for a property and both dates instead of searching when they are missing', async () => {
    const { repositories, searchUnits } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await screen.findByRole('radio', { name: MOUNTAIN });
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByText('Elige una sede para buscar.')).toBeOnTheScreen();
    expect(searchUnits).not.toHaveBeenCalled();

    await user.press(screen.getByRole('radio', { name: MOUNTAIN }));
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByText('Elige una fecha de entrada.')).toBeOnTheScreen();
    expect(screen.getByText('Elige una fecha de salida.')).toBeOnTheScreen();
    expect(searchUnits).not.toHaveBeenCalled();
  });

  it('keeps the date fields disabled until a property is chosen', async () => {
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await screen.findByRole('radio', { name: MOUNTAIN });
    expect(screen.getByRole('button', { name: /^Entrada: / })).toBeDisabled();
    await user.press(screen.getByRole('radio', { name: MOUNTAIN }));
    expect(screen.getByRole('button', { name: /^Entrada: / })).toBeEnabled();
  });

  it('does not offer dates before today in the property time zone', async () => {
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await user.press(screen.getByRole('button', { name: /^Entrada: / }));
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^jueves, 1 de octubre de 2026/ })).toBeEnabled();
  });

  it('searches with the chosen property, dates and guests, then lists the results', async () => {
    const { repositories, searchUnits } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Agregar un huésped' }));
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('button', { name: 'Ver detalles de Killa' })).toBeOnTheScreen();
    const query: AvailabilityQuery = searchUnits.mock.calls[0][0];
    expect(query).toEqual({
      propertyId: 'property-1',
      checkIn: '2026-10-20',
      checkOut: '2026-10-22',
      guests: 3,
    });
    expect(screen.getByText('1 alojamiento disponible')).toBeOnTheScreen();
  });

  it('navigates to the unit with the searched dates and guests', async () => {
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    await user.press(await screen.findByRole('button', { name: 'Ver detalles de Killa' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/units/[unitId]',
      params: { unitId: 'unit-1', checkIn: '2026-10-20', checkOut: '2026-10-22', guests: '2' },
    });
  });

  it('explains that the chosen dates passed instead of silently dropping results', async () => {
    const appState = jest.spyOn(AppState, 'addEventListener');
    appState.mockClear();
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('button', { name: 'Ver detalles de Killa' })).toBeOnTheScreen();

    // The app comes back to the foreground days later: the chosen check-in is now in the past.
    jest.setSystemTime(new Date('2026-11-01T12:00:00.000Z'));
    const handler = appState.mock.calls.find(([event]) => event === 'change')?.[1];
    await act(async () => {
      handler?.('active');
      await Promise.resolve();
    });

    expect(await screen.findByText('Las fechas seleccionadas ya pasaron')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver detalles de Killa' })).not.toBeOnTheScreen();
  });

  it('shows a loading region while the search is pending', async () => {
    const pending = jest.fn(() => new Promise(() => undefined));
    const { repositories } = setup(pending);
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByRole('progressbar', { name: 'Buscando disponibilidad…' }),
    ).toBeOnTheScreen();
  });

  it('shows the empty state when nothing is available', async () => {
    const { repositories } = setup(jest.fn().mockResolvedValue([]));
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Sin disponibilidad')).toBeOnTheScreen();
  });

  it('shows an error and recovers when retry succeeds', async () => {
    const searchUnits = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue([buildAvailableUnit()]);
    const { repositories } = setup(searchUnits);
    await renderWithProviders(<SearchScreen />, { repositories });

    await user.press(await screen.findByRole('radio', { name: MOUNTAIN }));
    await pickDates(user);
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('No pudimos buscar disponibilidad')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ver detalles de Killa' })).toBeOnTheScreen(),
    );
    expect(searchUnits).toHaveBeenCalledTimes(2);
  });

  it('shows a retry when the catalog fails to load', async () => {
    const getCatalog = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(catalog);
    const repositories = fakeRepositories({ property: { getCatalog } });
    await renderWithProviders(<SearchScreen />, { repositories });

    expect(await screen.findByText('No pudimos cargar las sedes')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('radio', { name: MOUNTAIN })).toBeOnTheScreen();
  });

  it('preselects the property passed by the route', async () => {
    setParams({ propertyId: 'property-2' });
    const { repositories } = setup();
    await renderWithProviders(<SearchScreen />, { repositories });

    expect(await screen.findByRole('radio', { name: 'Ayni Cusco, Cusco' })).toBeSelected();
  });
});
