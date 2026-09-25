import * as Calendar from 'expo-calendar';

export interface StayCalendarEvent {
  checkIn: string;
  checkOut: string;
  propertyName: string;
  unitName: string;
  title: string;
  location?: string | null;
}

/** Build local calendar dates from date parts; ISO parsing as UTC shifts the displayed day. */
export function calendarLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function buildStayCalendarForm(event: StayCalendarEvent) {
  return {
    title: event.title
      .replace('{{property}}', event.propertyName)
      .replace('{{unit}}', event.unitName),
    startDate: calendarLocalDate(event.checkIn),
    endDate: calendarLocalDate(event.checkOut),
    allDay: true,
    ...(event.location ? { location: event.location } : {}),
  };
}

export type CalendarActionResult = 'opened' | 'permission-denied';

export async function openStayCalendarForm(
  event: StayCalendarEvent,
): Promise<CalendarActionResult> {
  const permission = await Calendar.requestCalendarPermissions(true);
  if (permission.status !== 'granted') return 'permission-denied';
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const selected = calendars.find((calendar) => calendar.isPrimary) ?? calendars[0];
  if (!selected) throw new Error('calendar_unavailable');
  await selected.addEventWithForm(buildStayCalendarForm(event));
  // The Android dialog reports only `done`; neither platform result proves the event saved.
  return 'opened';
}
