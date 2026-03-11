import { Temporal } from "@js-temporal/polyfill";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import "./CalendarView.js";
import { BaseElement } from "../BaseElement/BaseElement.js";

type EventInput = {
  /**
   * iCalendar UID. Repeated occurrences should share this value.
   */
  uid?: string;
  /**
   * iCalendar RECURRENCE-ID for one occurrence in a recurring series.
   */
  recurrenceId?: string;
  start: string | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
  end: string | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
  summary: string;
  color: string;
};

type EventsMap = Map<string, EventInput>;

@customElement("calendar-month-view")
export class CalendarMonthView extends BaseElement {
  month = Temporal.Now.plainDateISO().month;
  year = Temporal.Now.plainDateISO().year;
  weekStart: "monday" | "sunday" = "monday";
  declare events?: EventsMap;
  locale?: string;
  timezone?: string;
  currentTime?: string;
  snapInterval = 15;

  static get properties() {
    return {
      month: { type: Number },
      year: { type: Number },
      weekStart: {
        type: String,
        attribute: "week-start",
        reflect: true,
        converter: {
          fromAttribute: (v: string | null): "monday" | "sunday" =>
            v === "sunday" ? "sunday" : "monday",
          toAttribute: (v: string): string => v,
        },
      },
      events: {
        type: Object,
        converter: {
          fromAttribute: (value: string | null): EventsMap =>
            new Map(JSON.parse(value || "[]") as Array<[id: string, event: EventInput]>),
        },
      },
      locale: { type: String },
      timezone: { type: String },
      currentTime: { type: String, attribute: "current-time" },
      snapInterval: { type: Number, attribute: "snap-interval" },
    } as const;
  }

  get startDate(): Temporal.PlainDate {
    const firstOfMonth = Temporal.PlainDate.from({
      year: this.year,
      month: this.month,
      day: 1,
    });

    const weekStart = this.#resolvedWeekStart;
    const weekdayOffset = weekStart === "monday"
      ? firstOfMonth.dayOfWeek - 1
      : firstOfMonth.dayOfWeek % 7;

    return firstOfMonth.subtract({ days: weekdayOffset });
  }

  get #resolvedWeekStart(): "monday" | "sunday" {
    if (this.hasAttribute("week-start")) return this.weekStart;
    return this.#weekStartFromLocale(this.locale);
  }

  #weekStartFromLocale(locale: string | undefined): "monday" | "sunday" {
    const resolvedLocale = locale || navigator.language || "en-US";

    try {
      const firstDay = new Intl.Locale(resolvedLocale).weekInfo?.firstDay;
      return firstDay === 7 ? "sunday" : "monday";
    } catch {
      // Conservative fallback: default to Monday when locale parsing is unavailable.
      return "monday";
    }
  }

  render() {
    return html`
      <calendar-view
        start-date=${this.startDate.toString()}
        days="42"
        variant="all-day"
        .events=${this.events}
        .locale=${this.locale}
        .timezone=${this.timezone}
        .currentTime=${this.currentTime}
        .snapInterval=${this.snapInterval}
        .labelsHidden=${false}
        @event-modified=${this.#reemit}
        @event-deleted=${this.#reemit}
      ></calendar-view>
    `;
  }

  #reemit = (event: Event) => {
    this.dispatchEvent(
      new CustomEvent(event.type, {
        detail: (event as CustomEvent).detail,
        bubbles: true,
        composed: true,
      })
    );
  };
}
