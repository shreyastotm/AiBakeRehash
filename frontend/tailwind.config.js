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
        // Secondary: Deep navy — structure, trust, sidebar
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
        // Semantic colours
        success: {
          DEFAULT: '#16A34A',
          light:   '#DCFCE7',
          dark:    '#14532D',
        },
        warning: {
          DEFAULT: '#D97706',
          light:   '#FEF3C7',
          dark:    '#78350F',
        },
        error: {
          DEFAULT: '#DC2626',
          light:   '#FEE2E2',
          dark:    '#7F1D1D',
        },
        info: {
          DEFAULT: '#2563EB',
          light:   '#DBEAFE',
          dark:    '#1E3A8A',
        },
        // Neutral — warm stone scale (pairs with orange brand)
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
        sans:    ['Inter', 'system-ui', ...fontFamily.sans],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', ...fontFamily.sans],
        mono:    ['"JetBrains Mono"', '"Fira Code"', ...fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:    ['0.75rem',  { lineHeight: '1rem' }],
        sm:    ['0.875rem', { lineHeight: '1.25rem' }],
        base:  ['1rem',     { lineHeight: '1.5rem' }],
        lg:    ['1.125rem', { lineHeight: '1.75rem' }],
        xl:    ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl': ['3rem',     { lineHeight: '1.2' }],
        '6xl': ['3.75rem',  { lineHeight: '1.1' }],
      },

      // ── Spacing extensions ───────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        sidebar:            '16rem',   // 256px expanded sidebar
        'sidebar-collapsed': '4rem',   // 64px icon-only sidebar
        topbar:             '4rem',    // 64px top bar height
      },

      // ── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        none:    '0',
        xs:      '0.125rem',
        sm:      '0.25rem',
        DEFAULT: '0.375rem',
        md:      '0.5rem',
        lg:      '0.75rem',
        xl:      '1rem',
        '2xl':   '1.25rem',
        '3xl':   '1.5rem',
        full:    '9999px',
      },

      // ── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        xs:    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm:    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        md:    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg:    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl:    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Brand-tinted shadows
        'primary-sm': '0 2px 8px 0 rgb(255 107 53 / 0.25)',
        'primary-md': '0 4px 16px 0 rgb(255 107 53 / 0.3)',
        none:  'none',
      },

      // ── Animations ───────────────────────────────────────────────────────
      transitionDuration: {
        fast:   '100ms',
        base:   '150ms',
        slow:   '250ms',
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
          '100%': { backgroundPosition:  '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in':        'fade-in 0.2s ease-smooth',
        'fade-in-up':     'fade-in-up 0.25s ease-smooth',
        'slide-in-right': 'slide-in-right 0.2s ease-smooth',
        'scale-in':       'scale-in 0.15s ease-spring',
        shimmer:          'shimmer 2s linear infinite',
        'bounce-subtle':  'bounce-subtle 2s ease-in-out infinite',
      },

      // ── Z-index scale ────────────────────────────────────────────────────
      zIndex: {
        dropdown: '1000',
        sticky:   '1020',
        fixed:    '1030',
        modal:    '1040',
        popover:  '1050',
        tooltip:  '1060',
        toast:    '1070',
      },

      // ── Screens ──────────────────────────────────────────────────────────
      screens: {
        xs:   '480px',
        sm:   '640px',
        md:   '768px',
        lg:   '1024px',
        xl:   '1280px',
        '2xl':'1536px',
      },
    },
  },
  plugins: [],
}
