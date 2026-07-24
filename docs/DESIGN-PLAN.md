# AllinBand Landing Page — Design Plan

## Objective

Redesign the AllinBand landing page as a dark premium health-tech experience. Protect readability for older adults and caregivers. Make the pilot signup feel trustworthy and human.

## Color Tokens

```
--bg-deep: #0b0f1a        --bg-surface: #111827
--bg-surface-alt: #1f2937  --bg-elevated: #1a2332
--text-primary: #f9fafb     --text-body: #d1d5db
--text-muted: #9ca3af       --accent-violet: #8b5cf6
--accent-cyan: #06b6d4      --accent-warm: #f59e0b
--border-subtle: rgba(255,255,255,0.08)
--glow-violet: rgba(139,92,246,0.25)
--glow-cyan: rgba(6,182,212,0.15)
```

## Typography

- Display: Space Grotesk (headings, stats)
- Body: Inter (general text)
- Mono: JetBrains Mono (data, counters)

## Section Plan

| Section | Treatment |
|---|---|
| Navbar | Dark glassmorphic, warm amber CTA |
| Hero | Aurora glow, ECG animation, pulse rings, gradient text |
| How it works | Vertical timeline with connected nodes |
| Patient benefits | 3x2 glassmorphic cards with colored borders |
| Caregiver benefits | 3 cards, same treatment |
| App features | 3 cards, same treatment |
| Technology | 3 stat counters + trust row |
| FAQ | Border-separated accordion with aria-controls |
| CTA | Warm glow, dark form inputs |
| Footer | Dark with gradient top border |

## Decision Trace

| Decision | Why | Tradeoff |
|---|---|---|
| Dark theme | Premium health-tech identity, enables glow effects | Higher contrast management needed |
| Amber CTA | Action hierarchy, warmth | Departs from violet brand palette |
| ECG as signature | Product-relevant, memorable | Animation complexity, needs reduced-motion |
| Glassmorphic cards | Dark-theme card treatment | backdrop-filter performance on old devices |
| Stats over cards | Scannable proof, less generic | Loses some feature detail |

## Files Modified

- `css/variables.css` — dark theme tokens
- `css/base.css` — dark body, display fonts
- `css/components.css` — glassmorphic cards, warm buttons
- `css/sections.css` — dark sections, ECG, timeline, stats
- `css/utilities.css` — updated color utilities
- `index.html` — new structure, aria-controls, pulse rings
- `js/animations.js` — stat counters, reduced-motion
- `js/form.js` — dark theme error styles, aria-describedby
