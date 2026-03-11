import type { Meta, StoryObj } from "@storybook/web-components-vite";
import "./CalendarMonthView.js";

type StoryEvent = {
  uid: string;
  recurrenceId?: string;
  start: string;
  end: string;
  summary: string;
  color: string;
};

type StoryEventEntry = [id: string, event: StoryEvent];
type StoryCalendarMonthViewElement = HTMLElement & { events: Map<string, StoryEvent> };

const sampleEvents: StoryEventEntry[] = [
  [
    "event-meeting-20250101",
    {
      uid: "meeting@example.test",
      start: "2025-01-01",
      end: "2025-01-03",
      summary: "Kickoff",
      color: "#4564B5",
    },
  ],
  [
    "event-workshop-20250115",
    {
      uid: "workshop@example.test",
      start: "2025-01-15",
      end: "2025-01-18",
      summary: "Workshop",
      color: "#63e657",
    },
  ],
];

const timezoneOptions =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC", "Europe/Amsterdam", "America/New_York", "Asia/Tokyo"];

const localeOptions = [
  "en-US",
  "en-GB",
  "nl-NL",
  "de-DE",
  "fr-FR",
  "es-ES",
  "it-IT",
  "pt-BR",
  "ja-JP",
  "zh-CN",
  "ar",
  "he",
];

const meta: Meta = {
  title: "CalendarView/CalendarMonthView",
  component: "calendar-month-view",
  tags: ["autodocs"],
  argTypes: {
    month: { control: { type: "number", min: 1, max: 12 } },
    year: { control: { type: "number", min: 1900, max: 2100 } },
    weekStart: { control: "select", options: ["monday", "sunday"] },
    locale: {
      control: "select",
      options: localeOptions,
      description: "Locale",
    },
    timezone: {
      control: "select",
      options: timezoneOptions,
      description: "IANA timezone",
    },
    currentTime: { control: "text", description: "Current time (ISO string)" },
  },
  args: {
    month: 1,
    year: 2025,
    weekStart: "monday",
    locale: "en-US",
    timezone: "Europe/Amsterdam",
    currentTime: "2025-01-15T14:30:00",
    events: sampleEvents,
  },
  render: (args) => {
    const el = document.createElement("calendar-month-view") as StoryCalendarMonthViewElement;
    el.style.display = "block";
    el.style.width = "100%";
    el.style.height = "100%";
    el.setAttribute("month", String(args.month));
    el.setAttribute("year", String(args.year));
    el.setAttribute("week-start", args.weekStart);
    if (args.locale) {
      el.setAttribute("locale", args.locale);
    }
    if (args.timezone) {
      el.setAttribute("timezone", args.timezone);
    }
    if (args.currentTime) {
      el.setAttribute("current-time", args.currentTime);
    }
    const entries = Array.isArray(args.events) ? args.events : sampleEvents;
    el.events = new Map(entries);
    return el;
  },
};

export default meta;

type Story = StoryObj;

export const MondayWeekStart: Story = {};

export const SundayWeekStart: Story = {
  args: {
    weekStart: "sunday",
  },
};
