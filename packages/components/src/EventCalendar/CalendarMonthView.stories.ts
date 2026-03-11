import type { Meta, StoryObj } from "@storybook/web-components-vite";
import "./CalendarMonthView.js";
import {
  localeOptions,
  sampleEvents,
  timezoneOptions,
  type StoryEvent,
} from "./storyData.js";

type StoryCalendarMonthViewElement = HTMLElement & { events: Map<string, StoryEvent> };

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
    snapInterval: { control: { type: "number", min: 5, max: 60, step: 5 } },
  },
  args: {
    month: 1,
    year: 2025,
    weekStart: "monday",
    locale: "en-US",
    timezone: "Europe/Amsterdam",
    currentTime: "2025-01-15T14:30:00",
    snapInterval: 15,
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
    el.setAttribute("snap-interval", String(args.snapInterval));
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
