import { html, nothing, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BaseElement } from "../BaseElement/BaseElement.js";
import type { TimelineEvent } from "../types/TimeLine.js";
import componentStyle from "./TimeLine.css?inline";

@customElement("time-line")
export class TimeLine extends BaseElement {
  @property({ type: Number })
  max = 100;

  @property({ type: Number })
  step = 10;

  /** Number of cells */
  @property({ type: Number })
  cells = 3;

  @property({ type: Number })
  columns = 7;

  @property({ attribute: false })
  headerTemplate: ((i: number) => TemplateResult) | undefined;

  @property({ attribute: false })
  eventTemplate: (ev: TimelineEvent) => TemplateResult = () => html``;

  @property({ attribute: false })
  footerTemplate:
    | ((
        cellIndex: number,
        visibleEvents: TimelineEvent[],
        allCellEvents: TimelineEvent[]
      ) => TemplateResult)
    | undefined;

  @property({ type: String, reflect: true })
  flow: "vertical" | "horizontal" = "vertical";

  /**
   * Horizontal only: `timeline` gives each event its own track (swimlane).
   * `masonry` packs overlapping events into the fewest rows: each event uses the
   * lowest lane where no still-active event (started, not yet ended) occupies that lane at its start.
   */
  @property({ type: String, reflect: true })
  layout: "default" | "timeline" | "masonry" = "default";

  /**
   * With horizontal `timeline` / `masonry`, omit event lanes that do not fit the cell (ResizeObserver).
   */
  @property({ type: String, reflect: true })
  height: "auto" | undefined = undefined;

  @property({ type: Array })
  events: TimelineEvent[] = [];

  @state()
  private accessor cellVisibleLanes: number[] = [];

  #cellsResizeObserver: ResizeObserver | null = null;

  static get styles() {
    return [...BaseElement.styles, unsafeCSS(componentStyle)];
  }

  #laneClip(): boolean {
    return (
      this.height === "auto" &&
      this.flow === "horizontal" &&
      (this.layout === "timeline" || this.layout === "masonry")
    );
  }

  #measureLaneCaps() {
    if (!this.#laneClip()) return;
    const n = Math.max(1, this.cells);
    const br = this.renderRoot?.querySelector(".event")?.getBoundingClientRect();
    let lh =
      br && br.height > 0
        ? br.height
        : parseFloat(getComputedStyle(this).getPropertyValue("--__event-height")) || 32;
    lh = Math.max(lh, 1);
    const next = new Array<number>(n).fill(Infinity);
    for (const node of (this.renderRoot as ShadowRoot).querySelectorAll(".cell")) {
      const i = Number((node as HTMLElement).dataset.cell);
      if (!Number.isFinite(i) || i < 0 || i >= n) continue;
      const main = (node as HTMLElement).querySelector(".cell-main") as HTMLElement | null;
      const ch = (main?.clientHeight ?? (node as HTMLElement).clientHeight) || 0;
      next[i] = ch <= 0 ? Infinity : Math.floor(ch / lh);
    }
    if (
      next.length === this.cellVisibleLanes.length &&
      next.every((v, j) => v === this.cellVisibleLanes[j])
    ) {
      return;
    }
    this.cellVisibleLanes = next;
  }

  disconnectedCallback() {
    this.#cellsResizeObserver?.disconnect();
    this.#cellsResizeObserver = null;
    super.disconnectedCallback();
  }

  updated(changed: Map<string | number | symbol, unknown>) {
    super.updated(changed);
    if (!this.#laneClip()) {
      this.#cellsResizeObserver?.disconnect();
      this.#cellsResizeObserver = null;
      if (this.cellVisibleLanes.length) this.cellVisibleLanes = [];
      return;
    }
    const cellsEl = this.renderRoot?.querySelector(".cells");
    const rebind =
      !this.#cellsResizeObserver ||
      changed.has("height") ||
      changed.has("flow") ||
      changed.has("layout") ||
      changed.has("cells") ||
      changed.has("columns");
    if (rebind && cellsEl) {
      this.#cellsResizeObserver?.disconnect();
      this.#cellsResizeObserver = new ResizeObserver(() => this.#measureLaneCaps());
      this.#cellsResizeObserver.observe(cellsEl);
    }
    queueMicrotask(() => this.#measureLaneCaps());
  }

  #tToPct(t: number) {
    return this.max > 0 ? (t / this.max) * 100 : 0;
  }

  /** Whether `ev` overlaps this cell’s absolute time range (includes continuations from earlier cells). */
  #eventOverlapsCell(ev: TimelineEvent, cell: number, span: number, gridMax: number): boolean {
    const t0 = cell * span;
    const t1 = Math.min((cell + 1) * span, gridMax);
    const evEnd = Math.min(ev.end, gridMax);
    return ev.start < t1 && evEnd > t0;
  }

  /**
   * Smallest per-cell lane cap along a horizontal segment (cells `cellStart` … `cellStart + rowSpan`),
   * clamped to the row. Hides the bar if any spanned cell cannot fit the lane.
   */
  #minLaneCapAcrossSpan(
    cellStart: number,
    rowSpan: number,
    cols: number,
    cellCount: number
  ): number {
    const C = Math.max(1, cols);
    const row = Math.floor(cellStart / C);
    const rowFirst = row * C;
    const rowLast = Math.min((row + 1) * C, cellCount) - 1;
    if (rowLast < rowFirst) return Infinity;
    const cellEnd = Math.min(cellStart + rowSpan, rowLast);
    let minCap = Infinity;
    for (let k = Math.max(cellStart, rowFirst); k <= cellEnd; k++) {
      minCap = Math.min(minCap, this.cellVisibleLanes[k] ?? Infinity);
    }
    return minCap;
  }

  /** Smallest lane cap among all cells in `row` that `ev` overlaps (that row’s time band only). */
  #minLaneCapForEventInRow(
    ev: TimelineEvent,
    row: number,
    cols: number,
    span: number,
    gridMax: number,
    cellCount: number
  ): number {
    const C = Math.max(1, cols);
    const rowFirst = row * C;
    const rowLast = Math.min((row + 1) * C, cellCount) - 1;
    if (rowLast < rowFirst) return Infinity;

    const tRow0 = rowFirst * span;
    const tRow1 = Math.min((row + 1) * C * span, gridMax);
    const evEnd = Math.min(ev.end, gridMax);
    const t0 = Math.max(ev.start, tRow0);
    const t1 = Math.min(evEnd, tRow1);
    if (t0 >= t1) return Infinity;

    const cStart = Math.floor(t0 / span);
    const cEnd = Math.min(Math.floor((t1 - Number.EPSILON) / span), rowLast);

    let minCap = Infinity;
    for (let k = Math.max(cStart, rowFirst); k <= Math.min(cEnd, rowLast); k++) {
      minCap = Math.min(minCap, this.cellVisibleLanes[k] ?? Infinity);
    }
    return minCap;
  }

  /** Greedy lowest-lane packing; intervals are [start, end). */
  #masonryLanes(events: TimelineEvent[]): number[] {
    const order = events
      .map((ev, i) => ({ ev, i }))
      .sort((a, b) => a.ev.start - b.ev.start || a.i - b.i);
    const ends: number[] = [];
    const lanes = new Array<number>(events.length);
    for (const { ev, i } of order) {
      let L = 0;
      while (L < ends.length) {
        const occupiedUntil = ends[L];
        if (occupiedUntil === undefined || occupiedUntil <= ev.start) break;
        L++;
      }
      if (L === ends.length) ends.push(ev.end);
      else ends[L] = ev.end;
      lanes[i] = L;
    }
    return lanes;
  }

  /** Per grid row: dense lanes and count, using only events that overlap that row’s time span. */
  #rowLaneLayouts(
    events: TimelineEvent[],
    mode: "timeline" | "masonry",
    cellCount: number,
    cols: number,
    span: number,
    gridMax: number
  ) {
    const C = Math.max(1, cols);
    const rows: { laneCount: number; laneByEventIndex: number[] }[] = [];
    for (let r = 0, n = Math.ceil(cellCount / C); r < n; r++) {
      const t0 = r * C * span;
      const t1 = Math.min((r + 1) * C, cellCount) * span;
      const inRow = events
        .map((ev, i) => ({ ev, i }))
        .filter(({ ev }) => ev.start < t1 && Math.min(ev.end, gridMax) > t0);
      if (!inRow.length) {
        rows.push({ laneCount: 1, laneByEventIndex: [] });
        continue;
      }
      const laneByEventIndex = new Array<number>(events.length);
      let laneCount: number;
      if (mode === "timeline") {
        inRow.sort((a, b) => a.i - b.i);
        for (let L = 0; L < inRow.length; L++) {
          const entry = inRow[L];
          if (entry) laneByEventIndex[entry.i] = L;
        }
        laneCount = inRow.length;
      } else {
        const subLanes = this.#masonryLanes(inRow.map((x) => x.ev));
        for (let j = 0; j < inRow.length; j++) {
          const entry = inRow[j];
          const lane = subLanes[j];
          if (entry && lane !== undefined) laneByEventIndex[entry.i] = lane;
        }
        laneCount = Math.max(...subLanes, 0) + 1;
      }
      rows.push({ laneCount: Math.max(1, laneCount), laneByEventIndex });
    }
    return rows;
  }

  #renderHeaderTemplate(i: number) {
    return this.headerTemplate?.(i);
  }

  #renderEventTemplate(ev: TimelineEvent) {
    return this.eventTemplate(ev);
  }

  #renderFooterTemplate(
    cellIndex: number,
    visibleEvents: TimelineEvent[],
    allCellEvents: TimelineEvent[]
  ) {
    return this.footerTemplate
      ? this.footerTemplate(cellIndex, visibleEvents, allCellEvents)
      : html``;
  }

  render() {
    const cellCount = Math.max(1, this.cells);
    const cellIndexes = Array.from({ length: cellCount }, (_, i) => i);
    const span = this.max > 0 ? this.max : 1;
    const gridMax = span * cellCount;
    const cols = Math.max(1, this.columns);
    const horiz = this.flow === "horizontal";
    const laneMode =
      horiz && this.events.length
        ? this.layout === "timeline" || this.layout === "masonry"
          ? this.layout
          : null
        : null;
    const rowLayouts = laneMode
      ? this.#rowLaneLayouts(this.events, laneMode, cellCount, cols, span, gridMax)
      : [];

    return html`
      <div class="viewport" style="--time-line-cols: ${cols}">
        <div class="cells">
          ${cellIndexes.map((cell) => {
            const rowIndex = Math.floor(cell / cols);
            const rl = laneMode ? (rowLayouts[rowIndex] ?? null) : null;
            const clip = this.#laneClip();
            const row = rowIndex;
            const cellEvents = this.events.flatMap((ev, i) => {
              const out: Array<{
                ev: TimelineEvent;
                index: number;
                segIndex: number;
                segStart: number;
                segEnd: number;
                rowSpan: number;
              }> = [];
              const evEnd = Math.min(ev.end, gridMax);
              let t = ev.start;
              let segIndex = 0;
              while (t < evEnd) {
                const c0 = Math.floor(t / span);
                const row = Math.floor(c0 / cols);
                const segEnd = horiz
                  ? Math.min(evEnd, (row + 1) * cols * span)
                  : Math.min(evEnd, (c0 + 1) * span);
                const c1 = horiz
                  ? Math.min(Math.floor((segEnd - Number.EPSILON) / span), (row + 1) * cols - 1)
                  : c0;
                if (c0 === cell) {
                  out.push({
                    ev,
                    index: i,
                    segIndex,
                    segStart: t - c0 * span,
                    segEnd: segEnd - c1 * span,
                    rowSpan: horiz ? c1 - c0 : 0,
                  });
                }
                t = segEnd;
                segIndex++;
              }
              return out;
            });

            const laneCount = rl?.laneCount ?? 1;
            const visibleCellEvents = cellEvents.filter(({ index, rowSpan }) => {
              if (!clip) return true;
              const lane = rl?.laneByEventIndex[index] ?? 0;
              const effCap = horiz
                ? this.#minLaneCapAcrossSpan(cell, rowSpan, cols, cellCount)
                : (this.cellVisibleLanes[cell] ?? Infinity);
              return lane < effCap;
            });
            const allCellEvents = this.events.filter((ev) =>
              this.#eventOverlapsCell(ev, cell, span, gridMax)
            );
            const visibleEvents = this.events.filter((ev, index) => {
              if (!this.#eventOverlapsCell(ev, cell, span, gridMax)) return false;
              if (!clip) return true;
              const lane = rl?.laneByEventIndex[index] ?? 0;
              const effCap = horiz
                ? this.#minLaneCapForEventInRow(ev, row, cols, span, gridMax, cellCount)
                : (this.cellVisibleLanes[cell] ?? Infinity);
              return lane < effCap;
            });
            return html`
              <div
                class="cell"
                data-cell=${cell}
                style="${
                  laneMode
                    ? `--__lane-count: ${laneCount}; --__lane-stack: calc(${laneCount} * var(--__event-height))`
                    : `--__lane-count: ${laneCount}`
                }"
              >
                ${
                  this.headerTemplate
                    ? html`<div class="cell-header">${this.#renderHeaderTemplate(cell)}</div>`
                    : nothing
                }
                <div class="cell-main">
                  ${visibleCellEvents.map(
                    ({ ev, index, segIndex, segStart, segEnd, rowSpan }) => html`
                      <div
                        class="event"
                        data-index=${index}
                        data-segment=${segIndex}
                        style="
                        --__lane:${laneMode ? (rl?.laneByEventIndex[index] ?? 0) : 0};
                        --__start:${this.#tToPct(segStart)}%;
                        --__end:${
                          rowSpan > 0
                            ? `calc(-${rowSpan * 100}% + ${100 - this.#tToPct(segEnd)}%)`
                            : `${100 - this.#tToPct(segEnd)}%`
                        };
                      "
                      >
                        ${this.#renderEventTemplate(ev)}
                      </div>
                    `
                  )}
                </div>
                ${
                  this.footerTemplate
                    ? html`<div class="cell-footer">
                      ${this.#renderFooterTemplate(cell, visibleEvents, allCellEvents)}
                    </div>`
                    : nothing
                }
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}
