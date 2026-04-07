# Styling Migration Policy (Tailwind-First, Pre-Beta)

## Status and Intent

This repository is pre-beta. We optimize for consistency and speed of iteration over backward compatibility.

- Tailwind is the single default styling system.
- Mixed Tailwind + stylesheet implementations inside the same component are not allowed.
- Breaking visual or API changes are acceptable when needed to complete migration.

## Policy Decision

1. **Default:** all component styling is authored with Tailwind utilities.
2. **Preferred Shadow DOM path:** use Tailwind in component stylesheets via `@apply` for `:host`, attribute selectors, and CSS parts APIs.
3. **Exception path:** raw CSS rules (without Tailwind utilities) are allowed only for hard technical constraints.
4. **No compatibility layer:** do not preserve legacy class contracts only to avoid breakage.

## Preferred Stylesheet Pattern (Shadow DOM)

For Lit components, this is the preferred pattern when selectors are host/part-oriented:

- Use stylesheet files with Tailwind `@apply`.
- Keep selector API explicit (`:host`, `:host([...])`, `::part(...)`).
- Keep utility-first semantics while preserving CSS API ergonomics.

Example:

```css
:host {
  @apply flex flex-col rounded-lg bg-white shadow-md;
}

:host([variant="primary"]) {
  @apply bg-blue-600 text-white;
}
```

## Allowed Exceptions (Strict)

Raw CSS (including Lit `static styles`) is allowed only for:

- `@keyframes` and animation definitions that are impractical in utilities.
- Advanced selectors/pseudo-elements not reasonably represented with utilities.
- Third-party library overrides where utilities cannot target required selectors.
- Shadow DOM-local styling where global utility classes cannot be applied.

Each exception must include an inline rationale comment with prefix:

- `/* tailwind-exception: <reason> */`

If no valid exception exists, use Tailwind utilities (`class` or `@apply`).

## Lit + Shadow DOM Rules

Because global utility classes do not cross Shadow DOM boundaries by default:

1. Prefer Tailwind utilities directly in templates where practical.
2. For host/part selectors, prefer stylesheet `@apply`.
3. If raw CSS is required, keep it minimal/local and document with `tailwind-exception`.
4. Do not add broad global CSS to bypass Shadow DOM isolation.

## Hard Migration Rules

These rules are mandatory during migration:

- No new raw stylesheet rules without either Tailwind `@apply` or a `tailwind-exception`.
- No new CSS modules for component styling unless they follow this same rule.
- No leaving partially migrated components in mixed mode.
- No retention of obsolete class names "for safety" in pre-beta.
- Remove dead CSS in the same PR where migration occurs.

## Migration Strategy (Stylesheet + `@apply`)

Migrate in waves, with decisive cutovers:

1. **Wave 1: Stabilize file structure**
   - Keep one dedicated stylesheet per component.
   - Avoid adding new inline `<style>` blocks or large `static styles` blocks in TS.
   - Keep style ownership local to each component folder.

2. **Wave 2: Convert classes to `@apply`**
   - Move inline Tailwind classes from templates into component CSS selectors.
   - Use `@apply` in `:host`, `:host([...])`, internal class selectors, and state selectors.
   - Preserve behavior and visual output while moving declarations.

3. **Wave 3: Move inline style attributes to CSS variables/selectors**
   - Replace inline `style=` usage with CSS custom properties where possible.
   - Keep dynamic values as variables; consume them in CSS rules.
   - Retain inline style attributes only for truly runtime-calculated geometry.

4. **Wave 4: Expose styling API via Shadow Parts (later phase)**
   - Add stable `part="..."` names to meaningful internal elements.
   - Document parts and host attributes as public styling API.
   - Avoid exposing implementation-only wrappers as public parts.

5. **Wave 5: Cleanup and hardening**
   - Remove dead selectors and obsolete utility remnants.
   - Standardize naming for host states/variants.
   - Validate visual parity and interaction states before closing migration.

For each wave:

- Keep changes reviewable and component-scoped.
- Accept breaking class/selector contracts during pre-beta when they simplify the model.
- Prefer consistency over partial local optimizations.

## Definition of Done (Per Component)

A component is complete only when all are true:

- Tailwind is the primary styling approach.
- Stylesheet rules use Tailwind `@apply`, or include a documented `tailwind-exception`.
- Inline Tailwind classes and inline style attributes are reduced or removed in favor of component CSS.
- Legacy stylesheet rules replaced by `@apply` are removed.
- No mixed implementation remains in active code paths.
- Lint/build/tests pass.

## Pull Request Requirements

Every styling migration PR must include:

- [ ] Component fully migrated or explicitly scoped with a clear follow-up issue.
- [ ] Stylesheet additions use `@apply`, or include valid `tailwind-exception` markers.
- [ ] Inline Tailwind classes moved to stylesheet selectors where practical.
- [ ] Inline style attributes moved to CSS variables/selectors where practical.
- [ ] All `tailwind-exception` comments have specific technical reasons.
- [ ] Removed dead CSS and unused selectors.
- [ ] Verified no unintended visual regressions.

## Enforcement

Enforce this policy in review and automation:

- Block PRs that add raw stylesheet rules without either `@apply` or `tailwind-exception`.
- Block PRs that leave mixed Tailwind + legacy stylesheet paths in one component.
- Prefer failing fast in CI over allowing drift.

## Non-Goals

- Maintaining legacy CSS contracts for downstream consumers during pre-beta.
- Building an abstraction layer to hide mixed styling systems.
- Converting everything in one giant PR without reviewable slices.

## Effective Date

Effective immediately for all new work and all touched UI components.
