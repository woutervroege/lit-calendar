import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { BaseElement } from "../BaseElement/BaseElement.js";
import {
  sharedButtonActiveBackgroundClasses,
  sharedButtonCompactVisualClasses,
  sharedButtonActiveTextClasses,
  sharedButtonDisabledClasses,
  sharedButtonFocusRingClasses,
  sharedButtonHoverTintClasses,
  sharedButtonVisualClasses,
  sharedFocusRingColorClasses,
} from "../shared/buttonStyles.js";

type ButtonType = "button" | "submit" | "reset";

@customElement("lc-button")
export class Button extends BaseElement {
  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  compact = false;

  @property({ type: String })
  label = "";

  @property({
    type: String,
    converter: {
      fromAttribute: (value: string | null): ButtonType =>
        value === "submit" || value === "reset" || value === "button" ? value : "button",
    },
  })
  type: ButtonType = "button";

  static get styles() {
    return [...BaseElement.styles];
  }

  render() {
    const visualClasses = this.compact ? sharedButtonCompactVisualClasses : sharedButtonVisualClasses;
    const buttonClasses = `${visualClasses} ${sharedButtonActiveBackgroundClasses} ${sharedButtonActiveTextClasses} ${sharedButtonHoverTintClasses} ${sharedFocusRingColorClasses} ${sharedButtonFocusRingClasses} ${sharedButtonDisabledClasses}`;
    return html`
      <button
        type=${this.type}
        class=${buttonClasses}
        ?disabled=${this.disabled}
        aria-label=${ifDefined(this.label || undefined)}
      >
        <slot></slot>
      </button>
    `;
  }
}
