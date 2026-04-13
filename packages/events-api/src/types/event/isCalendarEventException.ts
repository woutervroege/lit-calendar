import type { CalendarEvent } from "./CalendarEvent.js";

function isCalendarEventExcluded(event: CalendarEvent): boolean {
  if (!event.recurrenceId) return false;
  return Boolean(event.data.exclusionDates?.has(event.recurrenceId));
}

export function isCalendarEventException(event: CalendarEvent): boolean {
  if (event.isException === true) return true;
  if (!event.recurrenceId) return false;
  if (isCalendarEventExcluded(event)) return false;
  return !Boolean(event.data.recurrenceRule);
}
