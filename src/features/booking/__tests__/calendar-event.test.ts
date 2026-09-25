import * as Calendar from 'expo-calendar';
import {
  buildStayCalendarForm,
  calendarLocalDate,
  openStayCalendarForm,
} from '@/features/booking/calendar-event';

jest.mock('expo-calendar', () => ({
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
  EntityTypes: { EVENT: 'event' },
}));

describe('stay calendar event', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps date-only check-in and exclusive check-out as local all-day dates', () => {
    const form = buildStayCalendarForm({
      checkIn: '2027-03-13',
      checkOut: '2027-03-15',
      propertyName: 'Casa',
      unitName: 'Suite',
      title: 'Stay at {{property}} · {{unit}}',
    });
    expect(form).toMatchObject({ title: 'Stay at Casa · Suite', allDay: true });
    expect(form.startDate.getFullYear()).toBe(2027);
    expect(form.startDate.getMonth()).toBe(2);
    expect(form.startDate.getDate()).toBe(13);
    expect(form.endDate.getDate()).toBe(15);
    expect(form).not.toHaveProperty('location');
    expect(calendarLocalDate('2027-03-14').getDate()).toBe(14);
  });

  it('requests write-only permission after the action and opens a prefilled form', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'granted' } as never);
    const addEventWithForm = jest.fn().mockResolvedValue({ action: 'done' });
    jest
      .mocked(Calendar.getCalendars)
      .mockResolvedValue([{ isPrimary: true, addEventWithForm }] as never);
    const result = await openStayCalendarForm({
      checkIn: '2027-05-02',
      checkOut: '2027-05-04',
      propertyName: 'P',
      unitName: 'U',
      title: '{{property}} / {{unit}}',
    });
    expect(Calendar.requestCalendarPermissions).toHaveBeenCalledWith(true);
    expect(addEventWithForm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'P / U',
        allDay: true,
      }),
    );
    expect(result).toBe('opened');
  });

  it('does not open a form after permission denial', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'denied' } as never);
    const result = await openStayCalendarForm({
      checkIn: '2027-05-02',
      checkOut: '2027-05-04',
      propertyName: 'P',
      unitName: 'U',
      title: 'Stay',
    });
    expect(result).toBe('permission-denied');
    expect(Calendar.getCalendars).not.toHaveBeenCalled();
  });

  it('reports no native save result after the guest cancels the form or no calendar exists', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(Calendar.getCalendars).mockResolvedValue([]);
    await expect(
      openStayCalendarForm({
        checkIn: '2027-05-02',
        checkOut: '2027-05-04',
        propertyName: 'P',
        unitName: 'U',
        title: 'Stay',
      }),
    ).rejects.toThrow('calendar_unavailable');

    const addEventWithForm = jest.fn().mockResolvedValue({ action: 'canceled' });
    jest.mocked(Calendar.getCalendars).mockResolvedValue([{ addEventWithForm }] as never);
    await expect(
      openStayCalendarForm({
        checkIn: '2027-05-02',
        checkOut: '2027-05-04',
        propertyName: 'P',
        unitName: 'U',
        title: 'Stay',
      }),
    ).resolves.toBe('opened');
  });

  it('propagates native cancellation/errors without reporting that an event was saved', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'granted' } as never);
    const addEventWithForm = jest.fn().mockRejectedValue(new Error('native unavailable'));
    jest
      .mocked(Calendar.getCalendars)
      .mockResolvedValue([{ isPrimary: true, addEventWithForm }] as never);
    await expect(
      openStayCalendarForm({
        checkIn: '2027-05-02',
        checkOut: '2027-05-04',
        propertyName: 'P',
        unitName: 'U',
        title: 'Stay',
      }),
    ).rejects.toThrow('native unavailable');
  });
});
