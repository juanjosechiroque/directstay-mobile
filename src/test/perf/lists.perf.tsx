/**
 * List rendering measurements (JS only, run in Jest/Node, NOT on a device).
 *
 * Not part of `npm test`: run with
 *   npx jest --testMatch '**\/*.perf.tsx' --runInBand
 * It prints, for a large number of bookings, how many items React mounts on first render and
 * the React <Profiler> `actualDuration` of the initial commit. Durations are only comparable
 * between runs on the same machine; the mounted-item count is the stable signal.
 */
import { act, screen } from '@testing-library/react-native';
import { Profiler } from 'react';

import { MyBookingsScreen } from '@/features/booking/screens/MyBookingsScreen';
import { buildBooking } from '@/test/fixtures';
import { fakeRepositories, renderWithProviders } from '@/test/render';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const COUNTS = [10, 100, 500];

describe('MyBookings list mount cost', () => {
  it.each(COUNTS)('mounts with %i bookings', async (count) => {
    const bookings = Array.from({ length: count }, (_, i) =>
      buildBooking({ id: `b-${i}`, unitName: `Unit ${i}` }),
    );
    const repositories = fakeRepositories({
      booking: { listBookings: () => Promise.resolve(bookings) },
    });
    const durations: number[] = [];

    await renderWithProviders(
      <Profiler id="my-bookings" onRender={(_id, _phase, actual) => durations.push(actual)}>
        <MyBookingsScreen />
      </Profiler>,
      { repositories },
    );
    await screen.findByText('Unit 0', { exact: false });
    await act(async () => undefined);

    const mounted = screen.queryAllByLabelText(/^Unit \d+\./).length;
    const total = durations.reduce((sum, d) => sum + d, 0);
    console.log(
      `[perf] MyBookings bookings=${count} mountedItems=${mounted} commits=${durations.length} totalActualDuration=${total.toFixed(1)}ms`,
    );
    expect(mounted).toBeGreaterThan(0);
  });
});
