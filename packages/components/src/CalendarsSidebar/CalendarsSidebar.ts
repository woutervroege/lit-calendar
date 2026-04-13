import { html, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseElement } from "../BaseElement/BaseElement.js";
import type { Calendar, CalendarsMap } from "@lit-calendar/events-api";
import componentStyle from "./CalendarsSidebar.css?inline";

type AccountCalendarGroup = {
  accountId: string;
  entries: Array<[string, Calendar]>;
};

/** Groups by {@link Calendar.accountId}; accounts and calendars within each account are sorted by name/id. */
function calendarEntriesByAccount(map: CalendarsMap): AccountCalendarGroup[] {
  const byAccount = new Map<string, Array<[string, Calendar]>>();
  for (const entry of map.entries()) {
    const [calendarId, cal] = entry;
    const accountKey = cal.accountId;
    const bucket = byAccount.get(accountKey) ?? [];
    bucket.push([calendarId, cal]);
    byAccount.set(accountKey, bucket);
  }
  for (const list of byAccount.values()) {
    list.sort((a, b) =>
      a[1].displayName.localeCompare(b[1].displayName, undefined, { sensitivity: "base" })
    );
  }
  return [...byAccount.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([accountId, entries]) => ({ accountId, entries }));
}

function flatCalendarIdsInGroupOrder(groups: AccountCalendarGroup[]): string[] {
  return groups.flatMap((g) => g.entries.map(([id]) => id));
}

@customElement("calendars-sidebar")
export class CalendarsSidebar extends BaseElement {
  calendars?: CalendarsMap;
  /** When unset, every calendar in `calendars` is treated as selected. */
  selectedCalendarIds?: string[];

  static get properties() {
    return {
      calendars: { type: Object },
      selectedCalendarIds: { type: Array, attribute: false },
    } as const;
  }

  static get styles() {
    return [...BaseElement.styles, unsafeCSS(componentStyle)];
  }

  #effectiveSelectedSet(map: CalendarsMap): Set<string> {
    const explicit = this.selectedCalendarIds;
    if (explicit !== undefined) {
      return new Set(explicit);
    }
    return new Set(map.keys());
  }

  #toggleCalendarId(id: string): void {
    const map = this.calendars ?? new Map();
    const current = this.#effectiveSelectedSet(map);
    const nextSet = new Set(current);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    const order = flatCalendarIdsInGroupOrder(calendarEntriesByAccount(map));
    const nextIds = order.filter((calendarId) => nextSet.has(calendarId));
    this.selectedCalendarIds = nextIds;
    this.dispatchEvent(
      new CustomEvent("selected-calendar-ids-changed", {
        bubbles: true,
        composed: true,
        detail: { selectedCalendarIds: nextIds },
      })
    );
  }

  render() {
    const map = this.calendars ?? new Map();
    const groups = calendarEntriesByAccount(map);
    const selected = this.#effectiveSelectedSet(map);

    return html`
      <aside class="calendars-sidebar" aria-label="Calendars">
        <div class="calendar-list">
          ${groups.map(
            (group, groupIndex) => html`
              <section
                class="calendar-account-group"
                aria-labelledby=${`calendars-sidebar-account-${groupIndex}`}
              >
                <h3
                  class="calendar-account-label"
                  id=${`calendars-sidebar-account-${groupIndex}`}
                >
                  ${group.accountId}
                </h3>
                <div
                  class="calendar-account-calendars"
                  role="group"
                  aria-label=${`Calendars for account ${group.accountId}`}
                >
                  ${group.entries.map(
                    ([id, cal]) => html`
                      <div class="calendar-row">
                        <button
                          type="button"
                          class="calendar-toggle"
                          role="checkbox"
                          aria-checked=${selected.has(id) ? "true" : "false"}
                          title=${cal.url}
                          @click=${() => this.#toggleCalendarId(id)}
                        >
                          <span
                            class="calendar-swatch"
                            style=${`background-color: ${cal.color}`}
                            aria-hidden="true"
                          ></span>
                          <span class="calendar-name">${cal.displayName}</span>
                        </button>
                      </div>
                    `
                  )}
                </div>
              </section>
            `
          )}
        </div>
      </aside>
    `;
  }
}
