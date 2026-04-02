import { Temporal } from "@js-temporal/polyfill";
import { html, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import "../CalendarView/CalendarView.js";
import "../CalendarWeekdayHeader/CalendarWeekdayHeader.js";
import { BaseElement } from "../BaseElement/BaseElement.js";
import type { CalendarEventView as EventInput } from "../models/CalendarEvent.js";
import { SwipeSnapElement } from "../SwipSnapElement.js";
import { type AllDayLayoutItem, buildAllDayLayout } from "../utils/AllDayLayout.js";
import { getLocaleDirection, getLocaleWeekInfo } from "../utils/Locale.js";
import { getHourlyTimeLabels } from "../utils/TimeFormatting.js";
import componentStyle from "./CalendarWeekView.css?inline";

type EventEntry = [id: string, event: EventInput];
type EventsMap = Map<string, EventInput>;
type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function isWeekdayNumber(value: number | undefined): value is WeekdayNumber {
  return Boolean(value && Number.isInteger(value) && value >= 1 && value <= 7);
}

@customElement("calendar-week-view")
export class CalendarWeekView extends BaseElement {
  #startDate?: string;
  weekNumber = Temporal.Now.plainDateISO().weekOfYear;
  year = Temporal.Now.plainDateISO().year;
  weekStart?: WeekdayNumber;
  daysPerWeek = 7;
  visibleDays?: number;
  declare events?: EventsMap;
  locale?: string;
  timezone?: string;
  currentTime?: string;
  snapInterval = 15;
  visibleHours = 12;
  rtl = false;
  defaultEventSummary = "New event";
  defaultEventColor = "#0ea5e9";
  defaultCalendarId?: string;
  #splitEventsSource?: EventsMap;
  #cachedAllDayEvents: EventsMap = new Map();
  #cachedTimedEvents: EventsMap = new Map();
  #swipeIndex = 0;

  static get properties() {
    return {
      startDate: { type: String, attribute: "start-date" },
      weekNumber: { type: Number, attribute: "week-number" },
      year: { type: Number },
      weekStart: {
        type: Number,
        attribute: "week-start",
        reflect: true,
        converter: {
          fromAttribute: (v: string | null): WeekdayNumber | undefined => {
            if (v === null) return undefined;
            const day = Number(v);
            return isWeekdayNumber(day) ? day : undefined;
          },
          toAttribute: (v: number | undefined): string | null => (v ? String(v) : null),
        },
      },
      daysPerWeek: {
        type: Number,
        attribute: "days-per-week",
        reflect: true,
        converter: {
          fromAttribute: (v: string | null): number => {
            const n = Number(v);
            if (!Number.isFinite(n)) return 7;
            return Math.max(1, Math.min(7, Math.floor(n)));
          },
          toAttribute: (v: number): string => String(v),
        },
      },
      visibleDays: {
        type: Number,
        attribute: "visible-days",
        reflect: true,
        converter: {
          fromAttribute: (v: string | null): number | undefined => {
            if (v === null) return undefined;
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return Math.max(1, Math.min(7, Math.floor(n)));
          },
          toAttribute: (v: number | undefined): string | null =>
            typeof v === "number" ? String(v) : null,
        },
      },
      events: {
        type: Object,
        converter: {
          fromAttribute: (value: string | null): EventsMap =>
            new Map(JSON.parse(value || "[]") as EventEntry[]),
        },
      },
      locale: { type: String },
      timezone: { type: String },
      currentTime: { type: String, attribute: "current-time" },
      snapInterval: { type: Number, attribute: "snap-interval" },
      visibleHours: { type: Number, attribute: "visible-hours" },
      rtl: { type: Boolean, reflect: true },
      defaultEventSummary: { type: String, attribute: "default-event-summary" },
      defaultEventColor: { type: String, attribute: "default-event-color" },
      defaultCalendarId: { type: String, attribute: "default-source-id" },
    } as const;
  }

  static get styles() {
    return [...BaseElement.styles, unsafeCSS(componentStyle)];
  }

  get startDate(): Temporal.PlainDate {
    if (this.#startDate) {
      return Temporal.PlainDate.from(this.#startDate);
    }

    const firstOfYear = Temporal.PlainDate.from({
      year: this.year,
      month: 1,
      day: 1,
    });
    const weekStart = this.#resolvedWeekStart;
    const firstWeekStart = this.#startOfWeekFor(firstOfYear, weekStart);
    const normalizedWeek = Math.max(1, Number(this.weekNumber) || 1);
    return firstWeekStart.add({ days: (normalizedWeek - 1) * 7 });
  }

  set startDate(value: string | undefined) {
    this.#startDate = value || undefined;
  }

  get #resolvedWeekStart(): WeekdayNumber {
    if (isWeekdayNumber(this.weekStart)) return this.weekStart;
    return this.#weekStartFromLocale(this.locale);
  }

  get #allDayEvents(): EventsMap {
    this.#syncSplitEventsCache();
    return this.#cachedAllDayEvents;
  }

  get #timedEvents(): EventsMap {
    this.#syncSplitEventsCache();
    return this.#cachedTimedEvents;
  }

  get #renderedDays(): Temporal.PlainDate[] {
    return Array.from({ length: this.daysPerWeek }, (_, dayOffset) =>
      this.startDate.add({ days: dayOffset })
    );
  }

  get #allDayVisibleRowCount(): number {
    const renderedDays = this.#renderedDays;
    const layout = buildAllDayLayout({
      renderedDays,
      daysPerRow: renderedDays.length,
      items: this.#allDayLayoutItems,
    });
    return Math.max(1, layout.maxEventsOnAnyDay);
  }

  get #allDayLayoutItems(): AllDayLayoutItem[] {
    return this.#eventEntries
      .filter(([, event]) => this.#isAllDayEvent(event))
      .map(([id, event]) => ({
        id,
        start: this.#toPlainDateTime(event.start).toPlainDate(),
        endInclusive: this.#toPlainDateTime(event.end).subtract({ nanoseconds: 1 }).toPlainDate(),
      }));
  }

  get #eventEntries(): EventEntry[] {
    return Array.from(this.events?.entries() ?? []);
  }

  #isAllDayEvent(event: EventInput): boolean {
    return this.#isDateOnlyValue(event.start) || this.#isDateOnlyValue(event.end);
  }

  #isTimedEvent(event: EventInput): boolean {
    if (this.#isAllDayEvent(event)) return false;
    return (
      event.start instanceof Temporal.PlainDateTime ||
      event.start instanceof Temporal.ZonedDateTime ||
      event.end instanceof Temporal.PlainDateTime ||
      event.end instanceof Temporal.ZonedDateTime
    );
  }

  #isDateOnlyValue(value: EventInput["start"]): boolean {
    return value instanceof Temporal.PlainDate;
  }

  #toPlainDateTime(value: EventInput["start"]): Temporal.PlainDateTime {
    if (value instanceof Temporal.ZonedDateTime) {
      return this.timezone
        ? value.withTimeZone(this.timezone).toPlainDateTime()
        : value.toPlainDateTime();
    }
    if (value instanceof Temporal.PlainDateTime) {
      return value;
    }
    if (value instanceof Temporal.PlainDate) {
      return value.toPlainDateTime({ hour: 0, minute: 0, second: 0 });
    }
    const exhaustiveCheck: never = value;
    throw new TypeError(`Unsupported calendar event date value: ${String(exhaustiveCheck)}`);
  }

  #startOfWeekFor(date: Temporal.PlainDate, weekStart: WeekdayNumber): Temporal.PlainDate {
    const weekdayOffset = (date.dayOfWeek - weekStart + 7) % 7;
    return date.subtract({ days: weekdayOffset });
  }

  #weekStartFromLocale(locale: string | undefined): WeekdayNumber {
    const firstDay = getLocaleWeekInfo(locale).firstDay;
    if (isWeekdayNumber(firstDay)) return firstDay;
    return 1;
  }

  #syncSplitEventsCache() {
    if (this.events === this.#splitEventsSource) return;
    this.#splitEventsSource = this.events;
    const sourceEntries = Array.from(this.events?.entries() ?? []);
    this.#cachedAllDayEvents = new Map(
      sourceEntries.filter(([, event]) => this.#isAllDayEvent(event))
    );
    this.#cachedTimedEvents = new Map(
      sourceEntries.filter(([, event]) => this.#isTimedEvent(event))
    );
  }

  #setSwipeIndex(index: number, source?: EventTarget | null) {
    const next = Math.max(0, Math.min(this.daysPerWeek - 1, Math.floor(index)));
    if (next === this.#swipeIndex) return;
    this.#swipeIndex = next;
    this.requestUpdate();

    const sourceElement = source instanceof SwipeSnapElement ? source : null;
    const headerSnap = this.renderRoot.querySelector<SwipeSnapElement>("#combined-week-header-snap");
    const timedSnap = this.renderRoot.querySelector<SwipeSnapElement>("#combined-week-timed-snap");
    for (const snapElement of [headerSnap, timedSnap]) {
      if (!snapElement || snapElement === sourceElement || snapElement.currentIndex === next) continue;
      snapElement.currentIndex = next;
    }
  }

  #handleSwipePageChange = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail?.index !== "number") return;
    this.#setSwipeIndex(event.detail.index, event.currentTarget);
  };

  render() {
    const clampedVisibleHours = Math.max(
      1,
      Math.min(24, Math.floor(Number(this.visibleHours) || 12))
    );
    const timedHeightFactor = 24 / clampedVisibleHours;
    const direction = this.rtl ? "rtl" : getLocaleDirection(this.locale);
    const allDayRowHeight = `calc(var(--_lc-all-day-day-number-space, 36px) + ${this.#allDayVisibleRowCount} * var(--_lc-event-height, 32px))`;
    const visibleColumnsStyle =
      typeof this.visibleDays === "number"
        ? `--_lc-combined-visible-columns: ${this.visibleDays};`
        : "";
    const hourLabels = getHourlyTimeLabels(this.locale, 24);
    const swipeIndex = Math.max(0, Math.min(this.daysPerWeek - 1, this.#swipeIndex));
    if (swipeIndex !== this.#swipeIndex) {
      this.#swipeIndex = swipeIndex;
    }

    return html`
      <div
        class="combined-week-scroll-root"
        dir=${direction}
        style=${`--_lc-combined-days: ${this.daysPerWeek}; --_lc-combined-timed-height-factor: ${timedHeightFactor}; --_lc-all-day-row-height: ${allDayRowHeight};`}
      >
        <div class="combined-week-grid-canvas" style=${visibleColumnsStyle}>
          <header class="combined-week-header">
            <aside class="combined-week-header-sidebar" aria-hidden="true"></aside>
            <swipe-snap-element
              id="combined-week-header-snap"
              class="combined-week-swipe combined-week-header-main"
              style="--column-width: var(--_lc-combined-column-width);"
              .currentIndex=${swipeIndex}
              .dir=${direction}
              @pagechange=${this.#handleSwipePageChange}
            >
              ${this.#renderedDays.map(
                (day) => html`
                  <article class="combined-week-day-column">
                    <calendar-weekday-header
                      .locale=${this.locale}
                      .weekStart=${day.dayOfWeek as WeekdayNumber}
                      .days=${1}
                    ></calendar-weekday-header>
                    <calendar-view
                      class="combined-week-all-day-view"
                      start-date=${day.toString()}
                      days="1"
                      variant="all-day"
                      .events=${this.#allDayEvents}
                      .rtl=${this.rtl}
                      locale=${ifDefined(this.locale)}
                      timezone=${ifDefined(this.timezone)}
                      current-time=${ifDefined(this.currentTime)}
                      .snapInterval=${this.snapInterval}
                      .labelsHidden=${false}
                      .defaultEventSummary=${this.defaultEventSummary}
                      .defaultEventColor=${this.defaultEventColor}
                      .defaultCalendarId=${this.defaultCalendarId}
                      @day-selection-requested=${this.#reemit}
                      @event-create-requested=${this.#reemit}
                      @event-update-requested=${this.#reemit}
                      @event-delete-requested=${this.#reemit}
                    ></calendar-view>
                  </article>
                `
              )}
            </swipe-snap-element>
          </header>

          <main class="combined-week-main">
            <aside class="combined-week-time-sidebar" aria-hidden="true">
              <div class="combined-week-hour-labels">
                ${hourLabels.map(
                  (label, hour) => html`
                    <div class="combined-week-hour-label-row">
                      <time
                        class="combined-week-hour-label"
                        datetime=${`${hour.toString().padStart(2, "0")}:00`}
                        >${label}</time
                      >
                    </div>
                  `
                )}
              </div>
            </aside>
            <swipe-snap-element
              id="combined-week-timed-snap"
              class="combined-week-swipe combined-week-timed-snap"
              style="--column-width: var(--_lc-combined-column-width);"
              .currentIndex=${swipeIndex}
              .dir=${direction}
              @pagechange=${this.#handleSwipePageChange}
            >
              ${this.#renderedDays.map(
                (day) => html`
                  <article class="combined-week-day-column combined-week-timed-day-column">
                    <calendar-view
                      class="combined-week-timed-view"
                      start-date=${day.toString()}
                      days="1"
                      variant="timed"
                      .events=${this.#timedEvents}
                      .rtl=${this.rtl}
                      locale=${ifDefined(this.locale)}
                      timezone=${ifDefined(this.timezone)}
                      current-time=${ifDefined(this.currentTime)}
                      .snapInterval=${this.snapInterval}
                      .visibleHours=${this.visibleHours}
                      .labelsHidden=${true}
                      .defaultEventSummary=${this.defaultEventSummary}
                      .defaultEventColor=${this.defaultEventColor}
                      .defaultCalendarId=${this.defaultCalendarId}
                      @event-create-requested=${this.#reemit}
                      @event-update-requested=${this.#reemit}
                      @event-delete-requested=${this.#reemit}
                    ></calendar-view>
                  </article>
                `
              )}
            </swipe-snap-element>
          </main>
        </div>
      </div>
    `;
  }

  #reemit = (event: Event) => {
    event.stopPropagation();
    const forwardedEvent = new CustomEvent(event.type, {
      detail: (event as CustomEvent).detail,
      cancelable: event.cancelable,
    });
    const notCancelled = this.dispatchEvent(forwardedEvent);
    if (!notCancelled && event.cancelable) {
      event.preventDefault();
    }
  };
}
