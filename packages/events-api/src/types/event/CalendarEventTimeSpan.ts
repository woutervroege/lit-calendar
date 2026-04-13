import type { Temporal } from "@js-temporal/polyfill";
import type { CalendarEventDateValue } from "../calendar/CalendarEventDateValue.js";

export type CalendarEventTimeSpan =
  | {
      end: CalendarEventDateValue;
      duration?: never;
    }
  | {
      duration: Temporal.Duration;
      end?: never;
    };
