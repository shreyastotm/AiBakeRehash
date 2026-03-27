# Prompt 01 — Design System Foundation

## Objective
Establish a complete, consistent design token system as the single source of truth for the entire AiBakeRehash frontend. Every visual decision (color, spacing, typography, shadow, radius, animation) must flow from these tokens — no ad-hoc Tailwind values ever again.

---

## Files to Modify

1. `frontend/tailwind.config.js`
2. `frontend/src/styles/globals.css`
3. `frontend/src/utils/cn.ts` *(create — does not exist yet)*

---

## Task 1 — `frontend/tailwind.config.js`

Replace the current minimal config with this complete design token configuration. Read the file first, then replace it entirely.

```js
import { fontFamily } from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Brand Colors ────────────────────────────────────────────────────
      colors: {
        // Primary: Warm orange — CTAs, active states, logo
        primary: {
          DEFAULT: '#FF6B35',
          50:  '#FFF3EE',
          100: '#FFE4D5',
          200: '#FFC8AA',
          300: '#FFA87A',
          400: '#FF8C60',
          500: '#FF6B35',
          600: '#E55A22',
          700: '#C24718',
          800: '#9A360F',
          900: '#72270A',
        },
        // Secondary: Deep navy — structure, trust, headings
        secondary: {
          DEFAULT: '#004E89',
          50:  '#E6F0F9',
          100: '#C0D8F0',
          200: '#80B1E1',
          300: '#4089CC',
          400: '#1A6BA8',
          500: '#004E89',
          600: '#003A66',
          700: '#002B4D',
          800: '#001D33',
          900: '#000E1A',
        },
        // Accent: Golden amber — highlights, ratings, badges
        accent: {
          DEFAULT: '#F7931E',
          50:  '#FEF6E8',
          100: '#FDEACC',
          200: '#FBD499',
          300: '#F9BC66',
          400: '#FAA84B',
          500: '#F7931E',
          600: '#D97D0D',
          700: '#B56409',
          800: '#8F4C06',
          900: '#6A3604',
        },
        // Semantic
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#14532D',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#78350F',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#7F1D1D',
        },
        info: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
          dark: '#1E3A8A',
        },
        // Neutral (warm stone — better with the orange brand)
        neutral: {
          50:  '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
      },

      // ── Typography ──────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', ...fontFamily.sans],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', ...fontFamily.sans],
        mono: ['"JetBrains Mono"', '"Fira Code"', ...fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px
        xs:   ['0.75rem',  { lineHeight: '1rem' }],         // 12px
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],      // 14px
        base: ['1rem',     { lineHeight: '1.5rem' }],       // 16px
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],      // 18px
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],      // 20px
        '2xl':['1.5rem',   { lineHeight: '2rem' }],         // 24px
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],      // 30px
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],       // 36px
        '5xl':['3rem',     { lineHeight: '1.2' }],          // 48px
        '6xl':['3.75rem',  { lineHeight: '1.1' }],          // 60px
      },
      fontWeight: {
        thin:       '100',
        light:      '300',
        normal:     '400',
        medium:     '500',
        semibold:   '600',
        bold:       '700',
        extrabold:  '800',
        black:      '900',
      },

      // ── Spacing ─────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        sidebar: '16rem',         // 256px — collapsed sidebar
        'sidebar-collapsed': '4rem', // 64px — icon-only sidebar
        'topbar': '4rem',         // 64px — top bar height
      },

      // ── Border Radius ───────────────────────────────────────────────────
      borderRadius: {
        none: '0',
        xs: '0.125rem',
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },

      // ── Shadows ─────────────────────────────────────────────────────────
      boxShadow: {
        xs:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm:  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        md:  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg:  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl:  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl':'0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Brand shadows
        'primary-sm': '0 2px 8px 0 rgb(255 107 53 / 0.25)',
        'primary-md': '0 4px 16px 0 rgb(255 107 53 / 0.3)',
        none: 'none',
      },

      // ── Animation ───────────────────────────────────────────────────────
      transitionDuration: {
        fast: '100ms',
        base: '150ms',
        slow: '250ms',
        slower: '350ms',
      },
      transitionTimingFunction: {
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.2s ease-smooth',
        'fade-in-up':    'fade-in-up 0.25s ease-smooth',
        'slide-in-right':'slide-in-right 0.2s ease-smooth',
        'scale-in':      'scale-in 0.15s ease-spring',
        shimmer:         'shimmer 2s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },

      // ── Z-index ─────────────────────────────────────────────────────────
      zIndex: {
        dropdown: '1000',
        sticky:   '1020',
        fixed:    '1030',
        modal:    '1040',
        popover:  '1050',
        tooltip:  '1060',
        toast:    '1070',
      },

      // ── Screens ─────────────────────────────────────────────────────────
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
```

---

## Task 2 — `frontend/src/styles/globals.css`

Replace the current minimal globals with a full design foundation. Read the file first, then replace entirely.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── CSS Custom Properties (Design Tokens as CSS Variables) ──────────────── */
:root {
  /* Brand */
  --color-primary:        #FF6B35;
  --color-primary-dark:   #E55A22;
  --color-primary-light:  #FF8C60;
  --color-secondary:      #004E89;
  --color-secondary-dark: #003A66;
  --color-accent:         #F7931E;

  /* Semantic */
  --color-success:  #16A34A;
  --color-warning:  #D97706;
  --color-error:    #DC2626;
  --color-info:     #2563EB;

  /* Surfaces */
  --color-bg:           #FAFAF9;
  --color-bg-elevated:  #FFFFFF;
  --color-bg-sunken:    #F5F5F4;
  --color-border:       #E7E5E4;
  --color-border-focus: #FF6B35;

  /* Text */
  --color-text-primary:   #1C1917;
  --color-text-secondary: #57534E;
  --color-text-muted:     #A8A29E;
  --color-text-inverse:   #FFFFFF;

  /* Layout */
  --sidebar-width:           16rem;
  --sidebar-width-collapsed: 4rem;
  --topbar-height:           4rem;

  /* Motion */
  --duration-fast:   100ms;
  --duration-base:   150ms;
  --duration-slow:   250ms;
  --ease-smooth:     cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ── Dark Mode Variables ─────────────────────────────────────────────────── */
.dark {
  --color-bg:           #0C0A09;
  --color-bg-elevated:  #1C1917;
  --color-bg-sunken:    #0C0A09;
  --color-border:       #292524;
  --color-border-focus: #FF6B35;
  --color-text-primary:   #FAFAF9;
  --color-text-secondary: #D6D3D1;
  --color-text-muted:     #78716C;
}

/* ── Base Layer ──────────────────────────────────────────────────────────── */
@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    border-color: var(--color-border);
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
      Roboto, Oxygen, Ubuntu, sans-serif;
    font-feature-settings: 'cv11', 'ss01';
    font-variation-settings: 'opsz' 32;
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
  }

  h1 { font-size: 2.25rem; }
  h2 { font-size: 1.875rem; }
  h3 { font-size: 1.5rem; }
  h4 { font-size: 1.25rem; }
  h5 { font-size: 1.125rem; }
  h6 { font-size: 1rem; }

  /* Links */
  a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--duration-fast) var(--ease-smooth);
  }
  a:hover { color: var(--color-primary-dark); }

  /* Focus */
  :focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Images */
  img, video {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Code */
  code, kbd, pre, samp {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 0.875em;
  }

  /* Scrollbar (Webkit) */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
}

/* ── Component Layer ─────────────────────────────────────────────────────── */
@layer components {
  /* Page container */
  .page-container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8;
  }

  /* Section header (page title + subtitle) */
  .page-header {
    @apply flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8;
  }

  /* Card variants */
  .card {
    @apply bg-white rounded-xl border border-neutral-200 shadow-sm;
  }
  .card-elevated {
    @apply bg-white rounded-xl shadow-md;
  }
  .card-interactive {
    @apply card transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer;
  }

  /* Form controls */
  .form-label {
    @apply block text-sm font-medium text-neutral-700 mb-1.5;
  }
  .form-input {
    @apply w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5
           text-sm text-neutral-900 placeholder-neutral-400
           transition-colors duration-fast
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
           disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed;
  }
  .form-error {
    @apply text-xs text-error mt-1 flex items-center gap-1;
  }

  /* Status badge base */
  .badge {
    @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium;
  }

  /* Divider */
  .divider {
    @apply border-t border-neutral-200 my-6;
  }

  /* Shimmer skeleton */
  .skeleton {
    @apply bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200
           bg-[length:200%_100%] animate-shimmer rounded;
  }
}

/* ── Utility Layer ───────────────────────────────────────────────────────── */
@layer utilities {
  /* Truncate text with ellipsis */
  .text-balance {
    text-wrap: balance;
  }

  /* Hide scrollbar but keep scroll behaviour */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Touch-friendly minimum size */
  .touch-target {
    @apply min-h-[44px] min-w-[44px];
  }

  /* Brand gradient */
  .gradient-brand {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  }
  .gradient-brand-text {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Glass morphism card */
  .glass {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
```

---

## Task 3 — `frontend/src/utils/cn.ts` (Create new file)

Create a class-name utility that combines `clsx` and `tailwind-merge`. First check if `clsx` and `tailwind-merge` are in `frontend/package.json`. If they are not installed, add them to dependencies — but **do not run npm install**. Just add the packages to `package.json` and write the utility.

```ts
/**
 * cn — Class Name utility
 *
 * Merges Tailwind CSS classes safely, resolving conflicts (e.g. two padding
 * classes) and filtering falsy values. Use this everywhere instead of
 * string template literals for conditional class names.
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-primary', className)
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

---

## Verification Checklist

After completing these three tasks:

- [ ] `tailwind.config.js` exports a config object with the full color palette (primary, secondary, accent, neutral, success, warning, error, info as objects with numbered shades)
- [ ] `globals.css` defines CSS custom properties under `:root`, has a `.dark` block, and exports `@layer base`, `@layer components`, and `@layer utilities`
- [ ] `cn.ts` exports a `cn()` function using `clsx` + `twMerge`
- [ ] `frontend/package.json` lists `clsx` and `tailwind-merge` as dependencies (add if missing)
- [ ] TypeScript compiles without errors: `cd frontend && npx tsc --noEmit`
