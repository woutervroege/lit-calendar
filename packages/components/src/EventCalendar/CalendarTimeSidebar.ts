import { Temporal } from "@js-temporal/polyfill";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseElement } from "../BaseElement/BaseElement.js";

@customElement("calendar-time-sidebar")
export class CalendarTimeSidebar extends BaseElement {
  locale?: string;

  static get properties() {
    return {
      locale: { type: String },
    } as const;
  }

  static get styles() {
    return [
      ...BaseElement.styles,
      css`
        :host {
          display: grid;
          grid-template-rows: var(--_lc-all-day-row-height, 120px) 1fr;
          row-gap: 0;
          width: var(--_lc-time-sidebar-width, 56px);
          min-height: 0;
          color: var(--_lc-grid-line-day-color, light-dark(rgb(15 23 42 / 72%), rgb(255 255 255 / 72%)));
        }

        .all-day-label {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          padding-top: 8px;
          padding-right: 4px;
          font-size: 12px;
          line-height: 1;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
        }

        .hour-labels {
          display: flex;
          flex-direction: column;
          min-height: 0;
          margin-top: -8px;
          pointer-events: none;
          border-top: var(--_lc-week-section-divider-width, 3px) solid
            var(--_lc-week-section-divider-color, light-dark(rgb(15 23 42 / 22%), rgb(255 255 255 / 28%)));
        }

        .hour-label-row {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .hour-label {
          display: block;
          font-size: 12px;
          line-height: 1;
          font-weight: 500;
          white-space: nowrap;
          text-align: end;
        }
      `,
    ];
  }

  get #resolvedLocale(): string {
    return this.locale || navigator.language;
  }

  render() {
    return html`
      <div class="all-day-label">All-day</div>
      <div class="hour-labels">
        ${Array.from({ length: 24 }, (_, hour) => {
          const label = Temporal.PlainTime.from({ hour, minute: 0 }).toLocaleString(this.#resolvedLocale, {
            hour: "2-digit",
            minute: "2-digit",
          });
          return html`
            <div class="hour-label-row">
              <time class="hour-label" datetime=${`${hour.toString().padStart(2, "0")}:00`}>
                ${label}
              </time>
            </div>
          `;
        })}
      </div>
    `;
  }
}
