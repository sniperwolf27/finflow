import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (all map to CSS variables) ──────────────────
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Semantic colors — Apple HIG inspired
        success: {
          DEFAULT:    'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT:    'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card':         '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover':   '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'modal':        '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'button':       '0 1px 2px rgba(0,0,0,0.05)',
        'button-hover': '0 2px 6px rgba(0,0,0,0.10)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Apple HIG typography scale — exact pixel values
        'display':  ['34px', { lineHeight: '1.2', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'title-1':  ['28px', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        'title-2':  ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'title-3':  ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '1.4', letterSpacing: '0',        fontWeight: '600' }],
        'body':     ['17px', { lineHeight: '1.5', letterSpacing: '0',        fontWeight: '400' }],
        'callout':  ['16px', { lineHeight: '1.5', letterSpacing: '0',        fontWeight: '400' }],
        'subhead':  ['15px', { lineHeight: '1.4', letterSpacing: '0',        fontWeight: '400' }],
        'footnote': ['13px', { lineHeight: '1.4', letterSpacing: '0',        fontWeight: '400' }],
        'caption':  ['12px', { lineHeight: '1.3', letterSpacing: '0.01em',   fontWeight: '400' }],
      },
      transitionDuration: {
        // Apple HIG: 200ms for enter, 150ms for exit
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      },
    },
  },
  plugins: [],
} satisfies Config
