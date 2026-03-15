import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BaseElement } from "../BaseElement/BaseElement.js";

let tabSwitchInstanceId = 0;

@customElement("tab-switch")
export class TabSwitch extends BaseElement {
  #groupName = `tab-switch-${++tabSwitchInstanceId}`;

  @property({ type: Array })
  options: string[];

  @property({ type: String })
  value = "";

  @property({ type: String })
  name = "";

  @property({ type: String })
  ariaLabel = "Options";

  static get properties() {
    return {
      value: { type: String, dispatchChangeEvent: { composed: true } },
    } as const;
  }

  static get styles() {
    return [...BaseElement.styles];
  }

  render() {
    const groupName = this.name || this.#groupName;
    return html`
      <div
        class="inline-flex space-x-2 bg-white p-1 border border-gray-500/50 rounded-md text-sm"
        role="tablist"
        aria-label=${this.ariaLabel}
      >
        ${this.options.map((value, index) => {
          const inputId = `${groupName}-${value}-${index}`;
          const isChecked = value === this.value;
          return html`
            <div class="flex items-center">
              <input
                id=${inputId}
                type="radio"
                name=${groupName}
                class="hidden peer"
                value=${value}
                ?checked=${isChecked}
                @change=${(e: Event) => this.#handleChange(e)}
              />
              <label
                for=${inputId}
                class="cursor-pointer rounded py-2 px-8 text-gray-500 transition-colors duration-200 peer-checked:bg-indigo-600 peer-checked:text-white peer-disabled:opacity-55 peer-disabled:cursor-not-allowed"
                role="tab"
                aria-selected=${isChecked ? "true" : "false"}
              >
                ${value}
              </label>
            </div>
          `;
        })}
      </div>
    `;
  }

  #handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value as string;
    this.value = value;
  }
}
