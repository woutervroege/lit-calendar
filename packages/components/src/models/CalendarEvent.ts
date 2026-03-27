import type { Temporal } from "@js-temporal/polyfill";

export type CalendarEventDateValue =
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;

export type CalendarEventContent = {
  start: CalendarEventDateValue;
  end: CalendarEventDateValue;
  summary: string;
  color: string;
};

export type CalendarEventEnvelope = {
  id: string;
  sourceId?: string;
  eventId?: string;
  recurrenceId?: string;
  isException?: boolean;
  isOptimistic?: boolean;
  isRemoved?: boolean;
  removalScope?: "instance" | "series";
};

export type CalendarEvent = CalendarEventEnvelope & {
  content: CalendarEventContent;
};

/**
 * UI-facing event shape consumed by existing calendar components.
 * Keeps backward compatibility while the app model evolves.
 */
export type CalendarEventInput = {
  /**
   * Preferred logical identity for this event.
   */
  eventId?: string;
  recurrenceId?: string;
  start: string | CalendarEventDateValue;
  end: string | CalendarEventDateValue;
  summary: string;
  color: string;
  isException?: boolean;
  isOptimistic?: boolean;
  isRemoved?: boolean;
  removalScope?: "instance" | "series";
  sourceId?: string;
};

export type CalendarEventEntry = [id: string, event: CalendarEventInput];
