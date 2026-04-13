import type { CalendarEventPendingOperation } from "./CalendarEventPendingOperation.js";

export type CalendarEventEnvelope = {
  calendarId?: string;
  eventId?: string;
  recurrenceId?: string;
  isRecurring?: boolean;
  isException?: boolean;
  pendingOp?: CalendarEventPendingOperation;
};
