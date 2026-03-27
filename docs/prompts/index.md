# AiBakeRehash UI Improvement — Prompt Index

## Overview

This directory contains the detailed implementation prompts for the AiBakeRehash frontend UI/UX overhaul. Each prompt is a self-contained specification that can be executed independently or as part of the RuFlo pipeline defined in `.agents/aibake-ui-pipeline.yml`.

---

## Prompt Files

| # | File | Phase | Description | Depends On |
|---|------|-------|-------------|------------|
| 01 | [01-design-system.md](./01-design-system.md) | Foundation | Full design token system: Tailwind config, CSS variables, `cn()` utility | — |
| 02 | [02-component-library.md](./02-component-library.md) | Foundation | Standardize all common components with design tokens | 01 |
| 03 | [03-layout-navigation.md](./03-layout-navigation.md) | Layout | Sidebar + TopBar layout system, mobile drawer nav | 02 |
| 04 | [04-dashboard.md](./04-dashboard.md) | Pages | Welcome banner, KPI cards, quick actions, recent activity | 03 |
| 05 | [05-recipe-pages.md](./05-recipe-pages.md) | Pages | Fix broken classes, RecipeCard redesign, standardize forms | 03 |
| 06 | [06-journal-pages.md](./06-journal-pages.md) | Pages | Timeline view, rich entry detail, star ratings | 03 |
| 07 | [07-inventory-costing.md](./07-inventory-costing.md) | Pages | Stock table with alerts, costing calculator with margin slider | 03 |
| 08 | [08-auth-pages.md](./08-auth-pages.md) | Pages | Split-panel login/register with brand identity | 02 |

---

## How to Run the Pipeline

### Full pipeline (all phases in order):
```bash
npx @claude-flow/cli@latest workflow run .agents/aibake-ui-pipeline.yml
```

### Single phase:
```bash
npx @claude-flow/cli@latest workflow run .agents/aibake-ui-pipeline.yml --phase phase-1-design-system
```

### Or execute each prompt manually with Claude:
```
# In Claude Code:
> Execute docs/prompts/01-design-system.md
> Execute docs/prompts/02-component-library.md
# ... and so on
```

---

## Design System Summary

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary-500` | `#FF6B35` | CTAs, active nav, focus rings |
| `primary-600` | `#E55A22` | Hover state for primary |
| `secondary-500` | `#004E89` | Sidebar background, headings |
| `accent-500` | `#F7931E` | Star ratings, highlights, badges |
| `neutral-*` | warm stone scale | Text, borders, backgrounds |

### Typography Scale
- **Display font**: Plus Jakarta Sans (headings, logo)
- **Body font**: Inter (all body text)
- **Mono font**: JetBrains Mono (code, quantities)

### Key CSS Utility Classes (from globals.css)
| Class | Description |
|-------|-------------|
| `page-container` | Centered max-width page wrapper with padding |
| `page-header` | Flex row: title + action button |
| `card` | White rounded card with border + shadow |
| `card-interactive` | Card with hover lift animation |
| `form-label` | Standardized label style |
| `form-input` | Standardized input style |
| `gradient-brand` | Orange → golden amber gradient |
| `gradient-brand-text` | Same but as text gradient |
| `skeleton` | Animated shimmer loading placeholder |
| `touch-target` | min 44×44px touch area |
| `scrollbar-hide` | Hide scrollbar, keep scroll behaviour |

---

## Critical Bugs Fixed by This Pipeline

1. **Broken Tailwind classes** in `RecipeList.tsx` and `Pagination` — spaces inside class strings like `p - 1.5` and `min - w - [36px]` mean the classes were never applied (the elements had no styling)
2. **Color inconsistency** — `Button` uses `amber-600` instead of the `primary` design token; Dashboard KPI cards use `blue-600`/`green-600`; RecipeList pagination uses `amber-600` — all now unified under `primary-500`
3. **Inline SVGs everywhere** — replaced with lucide-react throughout for consistency and smaller bundle
4. **No `cn()` utility** — conditional className merging was done with template literals, which doesn't resolve Tailwind conflicts

---

## Tech Stack Context

```
Frontend: React 18 + TypeScript + Vite + Tailwind CSS 3.4
State: Zustand + TanStack Query
Icons: lucide-react
Forms: React Hook Form
i18n: i18next (EN/HI)
Backend: Express 3000 / PostgreSQL 5433 / Redis 6379
```

---

## Execution Order (Recommended)

```
01 → 02 → 03 → [04, 05, 06, 07, 08] (parallel)
```

Phases 04–08 are independent of each other after Phase 03 is complete and can run in parallel with the RuFlo pipeline.
