import type { Temporal } from "@js-temporal/polyfill";
import type { CalendarEventData } from "../event/index.js";
import type { CalendarEventEnvelope } from "../event/index.js";
import type { CalendarEventDateValue } from "../calendar/index.js";
import type { EventKey, EventTarget, Scope } from "./primitives.js";
import type { TimeRangeInput } from "./TimeRangeInput.js";

type CalendarEventDataWithoutTimeSpan = Omit<CalendarEventData, "start" | "end" | "duration">;

export type CreateEventData =
  | (CalendarEventDataWithoutTimeSpan & {
      start: CalendarEventDateValue;
      end: CalendarEventDateValue;
    })
  | (CalendarEventDataWithoutTimeSpan & {
      start: CalendarEventDateValue;
      duration: Temporal.Duration;
    });

export type CreateInput = {
  key?: EventKey;
  event: CalendarEventEnvelope & { data: CreateEventData };
};

export type UpdateInput = {
  target: EventTarget;
  scope: Scope;
  patch: Partial<Pick<CalendarEventData, "summary" | "color" | "location">> &
    Partial<Pick<CalendarEventEnvelope, "calendarId">> &
    Partial<TimeRangeInput>;
};

export type MoveInput = {
  target: EventTarget;
  scope: Scope;
  delta: Temporal.Duration;
  options?: {
    keepExceptionTiming?: boolean;
    shiftExceptionRecurrenceId?: boolean;
    shiftExclusionDates?: boolean;
  };
};

export type ResizeStartInput = {
  target: EventTarget;
  scope: Scope;
  toStart: CalendarEventDateValue;
  options?: {
    minDuration?: Temporal.Duration;
    preserveDateOnly?: boolean;
  };
};

export type ResizeEndInput = {
  target: EventTarget;
  scope: Scope;
  toEnd: CalendarEventDateValue;
  options?: {
    minDuration?: Temporal.Duration;
    preserveDateOnly?: boolean;
  };
};

export type RemoveInput = {
  target: EventTarget;
  scope: Scope;
  options?: {
    exceptionAsExclusion?: boolean;
  };
};

export type AddExclusionInput = {
  target: EventTarget;
  recurrenceId: string;
};

export type RemoveExclusionInput = {
  target: EventTarget;
  recurrenceId: string;
};

export type AddExceptionEventInput =
  | (Partial<Pick<CalendarEventData, "summary" | "color" | "location">> &
      Partial<Pick<CalendarEventEnvelope, "calendarId">> & {
        start: CalendarEventDateValue;
        end: CalendarEventDateValue;
      })
  | (Partial<Pick<CalendarEventData, "summary" | "color" | "location">> &
      Partial<Pick<CalendarEventEnvelope, "calendarId">> & {
        start: CalendarEventDateValue;
        duration: Temporal.Duration;
      });

export type AddExceptionInput = {
  target: EventTarget;
  recurrenceId: string;
  event: AddExceptionEventInput;
  options?: {
    conflictPolicy?: "replace" | "merge" | "error";
  };
};

export type RemoveExceptionInput = {
  target: EventTarget;
  recurrenceId?: string;
  options?: {
    asExclusion?: boolean;
  };
};
