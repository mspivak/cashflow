---
name: Cashflow Tracker
description: A forward-looking personal finance planner built around expected vs actual amounts
colors:
  paper: "oklch(0.984 0.003 250)"
  ink: "oklch(0.21 0.012 250)"
  ink-blue: "oklch(0.45 0.13 255)"
  ledger-green: "oklch(0.46 0.1 152)"
  graphite: "oklch(0.42 0.015 250)"
  alarm-red: "oklch(0.5 0.18 25)"
  band-ink: "oklch(0.32 0.015 255)"
  band-red: "oklch(0.44 0.15 25)"
  mist: "oklch(0.955 0.005 250)"
  hairline: "oklch(0.912 0.006 250)"
typography:
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    fontVariation: "tabular-nums"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    letterSpacing: "0.05em"
rounded:
  sm: "3px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-recorded:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.ledger-green}"
    rounded: "{rounded.sm}"
    padding: "4px 6px"
  band:
    backgroundColor: "{colors.band-ink}"
    textColor: "{colors.paper}"
    height: "44px"
---

# Design System: Cashflow Tracker

## 1. Overview

**Creative North Star: "The Horizon Ledger"**

The board is a landscape of months: income rises above a dark horizon line, spending hangs below it, and the projected balance rolls across the terrain as a shaded wedge. The horizon (the month band) is the instrument's dial: every number on it must be trustworthy at a glance. The system's personality is calm, precise, trustworthy — a reliable instrument in the register of Linear and the Stripe Dashboard, never a coach, never a toy.

Everything decorative is rejected. Color appears only when it carries meaning: green is money in, graphite is money out, red is danger, blue is the user's own position and actions. The neutrals are paper and ink tinted faintly toward blue (hue 250, chroma ≤ 0.012); pure black and pure white are forbidden.

**Key Characteristics:**
- Numbers first: tabular numerals everywhere money appears
- One accent (ink-blue) for actions and "you are here", ≤10% of any screen
- Solid means recorded, dashed means planned — the whole data language in one border style
- Light is the designed default (kitchen-table planning); dark is fully tokened

## 2. Colors

Paper-and-ink neutrals with one decisive blue accent and three semantic money colors.

### Primary
- **Ink Blue** (oklch(0.45 0.13 255)): primary actions ("Save to Account", "Save"), the current-month tint, the starting-balance marker, focus rings. This is the user's color: where they are and what they can do.

### Neutral
- **Paper** (oklch(0.984 0.003 250)): the app background.
- **Ink** (oklch(0.21 0.012 250)): primary text.
- **Mist** (oklch(0.955 0.005 250)): muted surfaces, column backgrounds at 30%.
- **Hairline** (oklch(0.912 0.006 250)): borders and dividers.
- **Band Ink** (oklch(0.32 0.015 255)): the month band, the horizon line itself.

### Semantic (data only)
- **Ledger Green** (oklch(0.46 0.1 152)): income, and only income.
- **Graphite** (oklch(0.42 0.015 250)): spending. Deliberately quiet; spending is normal, not alarming.
- **Alarm Red** (oklch(0.5 0.18 25)): negative balance, debt risk, destructive actions. **Band Red** (oklch(0.44 0.15 25)) is its band variant.

### Named Rules
**The One Accent Rule.** Ink-blue is the only non-semantic color and covers ≤10% of any screen. If blue appears anywhere that isn't an action, a selection, or the user's position, it is wrong.

**The Semantic Lock Rule.** Green, graphite, and red belong to money states exclusively. They are prohibited on chrome, headings, icons, or decoration.

## 3. Typography

**Body Font:** system-ui stack (native on every platform)

**Character:** a single well-tuned sans carries everything; product UIs earn trust through consistency, not display faces. Money is always set in tabular numerals so columns of figures align.

### Hierarchy
- **Title** (600, 1.25rem): page heading, cashflow name.
- **Body** (400, 0.875rem): forms, dialogs, prose.
- **Data** (600, 0.8125rem, tabular-nums): the projected balance on the band; the most important number on screen and the largest number on the board.
- **Label** (500, 0.625rem, +0.05em, uppercase where used): month names on the band, board add-buttons, the legend.

### Named Rules
**The Tabular Rule.** Every currency amount renders with `tabular-nums`. Proportional digits in a money column are a defect.

## 4. Elevation

Flat by default. Depth is conveyed by tonal layering (paper → mist → band ink) and hairline borders, not shadows. The only shadows in the system sit under the balance-marker dots on the wedge, where they lift the marker off the chart. Modals use the shadcn dialog default. No glassmorphism, no blurs.

### Named Rules
**The Flat Ledger Rule.** Surfaces are flat. If a card needs a shadow to be findable, its layout is wrong.

## 5. Components

### Item Cards (signature)
- **Shape:** barely-rounded rectangle (3px), full 1px border. Side-stripe accents (thick colored left borders) are prohibited.
- **Recorded** (an entry that happened): solid border (income: green at 60%, spend: graphite at 50%), tinted fill (12% / 10%), full-strength text.
- **Planned** (an expected item): dashed border, fainter fill (5% / 4%), softened text. Dashed = not yet real, across the whole system.
- **Debt risk:** dashed alarm-red border, red tint, TriangleAlert icon (10px). Never an emoji.
- **Height** is proportional to amount (auto-fitted so the largest visible stack always fits its half of the column).

### The Month Band (signature)
- 44px dark band (Band Ink; Band Red when the projected balance is negative) running at a fixed y across every column.
- Line 1: month label (10px, uppercase, white 70%).
- Line 2: projected balance (13px, semibold, tabular, white) + monthly delta chip (10px, white/10 pill, emerald-200 positive / red-200 negative). Recorded-vs-planned detail lives in the chip's tooltip.

### Buttons
- **Primary:** Ink Blue fill, paper text, 8px radius (shadcn default sizing).
- **Ghost:** transparent, muted text, mist hover. Icon-only buttons always carry an aria-label.
- **Board add-buttons:** always visible at 50% opacity in their semantic color; full color + tinted hover on column hover; focus-visible ring.

### Inputs / Fields
shadcn defaults on the token layer: hairline stroke, paper background, ink-blue focus ring.

### Legend
A 10px muted key pinned bottom-right of the board: solid swatch "Recorded", dashed swatch "Planned", wedge triangle "Projected balance". It exists so an invitee needs no explanation.

## 6. Do's and Don'ts

### Do:
- **Do** set every amount in tabular-nums with an explicit sign (+/−) and `$` prefix.
- **Do** keep dashed-vs-solid as the only encoding of planned-vs-recorded.
- **Do** tint every neutral toward hue 250; chroma between 0.003 and 0.015.
- **Do** keep the band at a fixed y across all twelve columns under all data.

### Don't:
- **Don't** use "generic fintech SaaS" styling: navy/gold gradients, hero-metric cards, glassmorphism (PRODUCT.md anti-reference, verbatim).
- **Don't** drift toward "toy budgeting apps": mascots, confetti, gamified streaks, emoji as UI icons (PRODUCT.md anti-reference).
- **Don't** rebuild "corporate banking portal" density: gray bureaucratic forms, compliance-heavy tables (PRODUCT.md anti-reference).
- **Don't** use `border-left` thicker than 1px as a colored accent; side stripes are prohibited.
- **Don't** use pure #000 or #fff anywhere.
- **Don't** put green, graphite, or red on anything that isn't money.
