---
name: Nocturnal Velocity
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffc174'
  on-tertiary: '#472a00'
  tertiary-container: '#f59e0b'
  on-tertiary-container: '#613b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets urban commuters, delivery drivers, and long-haul motorists navigating complex road networks across Thailand during dusk, nighttime, and inclement weather. The user operates in an ergonomically hostile cockpit: peripheral road glare, shifting cabin luminance, dashboard reflections, and fleeting glance windows (0.5 to 1.5 seconds per eye fixation).

The visual aesthetic fuses **HUD-inspired high-contrast utilitarianism** with **deep ambient minimalism**. Interfaces must never illuminate the vehicle interior or cause pupil contraction. Depth is achieved through layered deep-slate stratas rather than bright surface tints, while information hierarchy relies on luminous, emission-like accents that punch through the darkness without optic bleeding.

### Emotional Response
- **Assurance & Calm:** The UI eliminates jarring bright blurs and blue-light glare, calming driver tension in dense Bangkok gridlock or unlit rural motorways.
- **Instant Optical Decoupling:** Critical incident types (stalled vehicles, police presence, floods, accidents) trigger instant cognitive recognition via high-saturation luminous semaphores.
- **Effortless Precision:** Large spatial buffers and substantial touch targets minimize mis-taps caused by vehicle vibrations.

## Colors

The color palette is engineered specifically for scotopic and mesopic (nighttime) vision, prioritizing high-luminance signal colors anchored over non-emissive obsidian bases.

### Canvas & Surfaces
- **Canvas Base (`#020617`):** Deepest void; used for the primary map surface, bottom sheets background, and edge padding.
- **Surface Elevation 1 (`#0F172A`):** Low-glare foundational slate for floating cards, turn-by-turn prompts, and control decks.
- **Surface Elevation 2 (`#1E293B`):** Active card backgrounds, selected items, and interactive touch controls.
- **Structural Outlines (`#334155`):** Subtle edge boundaries ensuring card definition against dark map tiles.

### Semantic Luminescence
- **Electric Cyan (`#38BDF8`):** The primary navigational vector, GPS track, route previews, and distance gauges.
- **Vivid Emerald (`#10B981` / `#34D399`):** Free-flowing traffic corridors, confirmed safe reports, active speed-limit matches, and successful syncs.
- **Warning Amber/Orange (`#F59E0B` / `#FB923C`):** Heavy traffic slowdowns, dynamic road hazards, construction alerts, and speed camera proximities.
- **Crimson Hazard (`#EF4444` / `#F87171`):** Stopped traffic, accidents, flooding warnings, high-priority road closures, and emergency SOS triggers.

### Typography & Readability
- **Primary Text (`#F8FAFC`):** Purest contrast for high-priority numbers, directional street names, and critical alerts.
- **Secondary Text (`#CBD5E1`):** Sub-instructions, metadata, distances, and elapsed times.
- **Muted Text (`#64748B`):** Inactive toggles, secondary map meta, and past timestamps.

## Typography

Typography must balance Latin navigation terms with Thai script legibility at arm's length. **Space Grotesk** powers rapid-glance navigation metrics (speeds, distances, cardinal directions, exit codes) due to its open apertures and distinct numerical shapes. **Plus Jakarta Sans** serves as the primary multilingual body engine, pairing harmoniously with contemporary looped and loopless Thai fonts (such as Prompt or Sukhumvit) by preserving equalized x-heights, wide terminal tracking, and substantial counter-spaces.

### Rules for Driver Legibility
- Never use font weights below `400`. Hairline typography fractures against luminous car mounts.
- Speed and turn markers (`display-lg`, `label-lg`) utilize tabular lining figures to avoid rhythmic jitter during rapid GPS speed adjustments.
- Thai street names (such as "ถนนสุขุมวิท" or "ทางพิเศษศรีรัช") must always render at `body-lg` or `headline-md` when placed in active turn cards, with increased vertical line-height (`lineHeight: 1.5`) to accommodate complex diacritics without clipping.

## Layout & Spacing

The layout model is split into two operational modes: **In-Flight Navigation (HUD Mode)** and **Static Crowdsource/Planning Mode**.

### Touch Ergonomics & Safe Zones
- **Bottom-Weighted Thumb Zone:** All primary controls (incident reporting, route swapping, sound toggle) live within the bottom 35% of the mobile viewport.
- **Top Glance Deck:** Reserved exclusively for high-contrast directional arrows, street text, and lane guidance indicators.
- **Minimum Touch Target:** Strict 56×56px boundary for all driving-state interactive elements, buffered by `space-sm` gaps to eliminate unintended inputs over bumps and road vibrations.

### Fluid Grid Adaptation
- **Mobile (Car Mount Portrait):** Single-column stacked system. Margins stay tight at `1rem` to maximize spatial visibility of the underlying dark map vector.
- **Landscape / In-Dash / Tablet:** Splits into an asymmetrical 40/60 cockpit view: left panel handles turn feeds and incident notifications; right panel houses the interactive map canvas.

## Elevation & Depth

Visual separation relies on **dark glassmorphism, structured perimeter strokes, and local luminous containment**, avoiding high-spread fuzzy drop shadows that wash out dark cockpit displays.

### Depth Hierarchy
1. **Base Layer (Elevation 0 - Map Canvas):** Pure obsidian slate (`#020617`), desaturated roads, and low-contrast landmarks.
2. **Floated Navigation Cards (Elevation 1):** Solid `#0F172A` with `backdrop-filter: blur(16px)` and a `1px` subtle outline in `#334155`. 
3. **Transient Modals & Crowdsource Alert Pods (Elevation 2):** Layered `#1E293B` surfaces paired with a crisp edge stroke (`rgba(255, 255, 255, 0.08)`).
4. **Active Signal Glow (Incident Focus):** High-priority alerts project a concentrated, low-radius glow (`0 0 24px rgba(239, 68, 68, 0.35)` for hazards; `0 0 20px rgba(56, 189, 248, 0.25)` for route prompts). Shadows must remain tight and color-saturated, creating an optical perception of self-illuminating hardware.

## Shapes

The design system employs a refined geometric curve strategy:
- Standard buttons, speed badges, and situational cards use **0.5rem (8px)** corner radiuses, balancing tech-oriented precision with modern software elegance.
- Large floating navigation containers use **`rounded-lg` (1rem / 16px)** to separate structural app regions from the map viewport cleanly.
- Icon circles, quick-report incident buttons, and speed limit markers use fully continuous circular envelopes (`pill-shaped` / 9999px) to signal pure tapability.

## Components

### Action & Navigation Buttons
- **Primary Drive Action:** High-saturation Cyan background (`#38BDF8`), pure dark text (`#020617`), bold weight. Focus/Active states use a luminous cyan rim glow.
- **Hazard & SOS Triggers:** Saturated Crimson (`#EF4444`) with high-contrast white text (`#F8FAFC`). Height must never drop below 56px during active driving mode.
- **Secondary Actions:** Deep slate container (`#1E293B`) encased in `#334155` border, surfaced with `#F8FAFC` typography.

### Crowdsource Incident Badges & Chips
- **Incident Quick-Filter Chips:** Pill shapes using Elevation 1 surface (`#0F172A`), edged with `1px` dark slate borders. When active, background transitions to deep luminous tinting (e.g., `#0F172A` with `#F59E0B` border and text).
- **Incident Severity Indicators:** Fixed 32×32px circular pill anchors housing high-contrast SVGs depicting accidents, flash floods, or stalled vehicles.

### Input Fields & Search Bars
- **Address & Destination Entry:** Minimalist field with `#0F172A` fill and `#334155` border. Focused state replaces border with `#38BDF8` accompanied by an inner cyan focus ring. Large clear buttons (`×`) sized at 44×44px for effortless reset.

### Navigation Alert Cards
- **Turn-by-Turn Card:** Pinned to top viewport. Deep-slate backdrop with dual-line layout: bold white Thai street name (`headline-md`) alongside high-visibility lane indicators in Electric Cyan for the active lane and muted slate for inactive lanes.
- **Incident Notification Card:** Floats 16px above bottom navigation dock. Flanked with an accent colored left-border (4px width) matching the hazard category (Crimson for crash, Amber for roadwork, Emerald for clearing).

### Selection Controls (Checkboxes, Toggles & Radios)
- **Toggles:** Oversized slider tracks (60×34px) in `#1E293B` with high-contrast white toggles. Active state track illuminates to Emerald Green (`#10B981`) or Cyan (`#38BDF8`).
- **Speed Warning Badges:** Circular double-ring HUD display (Thai regulatory format: white interior, bold red border, black Space Grotesk numerals).