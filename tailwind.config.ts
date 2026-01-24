import type { Config } from 'tailwindcss';

/**
 * Film My Run - Tailwind Configuration
 *
 * Professional design system with semantic color tokens.
 * Colors reference CSS variables that change based on theme.
 * No need for dark: variants - just use semantic names.
 *
 * Usage:
 *   bg-background     → Page background (auto light/dark)
 *   bg-surface        → Cards, modals (auto light/dark)
 *   text-foreground   → Primary text (auto light/dark)
 *   text-muted        → Secondary text (auto light/dark)
 *   border-border     → Default borders (auto light/dark)
 *   bg-brand          → Brand orange (always orange)
 */

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ========================================
         SEMANTIC COLORS
         These reference CSS variables that change with theme
         ======================================== */
      colors: {
        // Brand colors (constant across themes)
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          hover: 'rgb(var(--color-brand-hover) / <alpha-value>)',
          muted: 'rgb(var(--color-brand-muted) / <alpha-value>)',
        },

        // Semantic surface colors (change with theme)
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          secondary: 'rgb(var(--color-surface-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-surface-tertiary) / <alpha-value>)',
        },

        // Semantic text colors (change with theme)
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        inverted: 'rgb(var(--color-text-inverted) / <alpha-value>)',

        // Semantic border colors (change with theme)
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          secondary: 'rgb(var(--color-border-secondary) / <alpha-value>)',
        },

        // Semantic status colors
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',

        // Keep original orange scale for gradients & special cases
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f88c00',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },

        // Keep zinc for explicit use cases (hero overlays, etc.)
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },

      /* ========================================
         TYPOGRAPHY
         ======================================== */
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'heading-xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.875rem', { lineHeight: '1.3' }],
        'heading-md': ['1.5rem', { lineHeight: '1.3' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },

      /* ========================================
         SPACING & SIZING
         ======================================== */
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      /* ========================================
         ANIMATIONS
         ======================================== */
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
