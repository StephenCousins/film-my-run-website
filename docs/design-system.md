# Design system

Moved from CLAUDE.md on 15 Oct 2026.

## Brand Colors

```css
/* Primary */
--orange-primary: #f88c00;      /* Main accent */
--orange-hover: #ff9f1c;        /* Hover state */
--orange-dark: #e07800;         /* Pressed state */

/* Neutrals - Light Mode */
--bg-primary: #fafafa;          /* Page background */
--bg-secondary: #ffffff;        /* Cards, elevated surfaces */
--bg-tertiary: #f4f4f5;         /* Subtle backgrounds */
--text-primary: #18181b;        /* Main text */
--text-secondary: #52525b;      /* Secondary text */
--text-muted: #a1a1aa;          /* Muted text */
--border: #e4e4e7;              /* Borders */

/* Neutrals - Dark Mode */
--dark-bg-primary: #09090b;     /* Page background */
--dark-bg-secondary: #18181b;   /* Cards, elevated surfaces */
--dark-bg-tertiary: #27272a;    /* Subtle backgrounds */
--dark-text-primary: #fafafa;   /* Main text */
--dark-text-secondary: #a1a1aa; /* Secondary text */
--dark-text-muted: #71717a;     /* Muted text */
--dark-border: #27272a;         /* Borders */

/* Semantic */
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
--info: #3b82f6;
```

## Logo

The brand lockup is a transparent PNG rendered via `next/image` in
`src/components/ui/FilmMyRunLogo.tsx`. Two variants ship in
`public/images/logo/`:

| File | Use on | Content |
|------|--------|---------|
| `fmr-logo-light.png` | Light backgrounds | Dark runner silhouettes |
| `fmr-logo-dark.png` | Dark backgrounds | White runner silhouettes |

Both are 1000 × 444 px (aspect ≈ 2.25). The wordmark ("Film My Run") is
baked into the artwork; no separate text is rendered. The component
auto-switches between variants based on the active theme.

## Typography

```css
/* Font Family */
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Space Grotesk', sans-serif;  /* Headlines */
--font-mono: 'JetBrains Mono', monospace;     /* Code, stats */

/* Scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px */
--text-6xl: 3.75rem;    /* 60px */
--text-7xl: 4.5rem;     /* 72px */
```

## Animation

1. **Scroll-triggered reveals**: content fades/slides in as user scrolls
2. **Staggered animations**: lists animate one item at a time
3. **Parallax depth**: background layers move slower than foreground
4. **Smooth transitions**: 0.3s ease for interactions, 0.6s for reveals
5. **Custom cursor**: context-aware (play button on videos, etc.)
6. **Respect reduced motion**: honor `prefers-reduced-motion`

Performance: GSAP for scroll animations (hardware accelerated), lazy load heavy
animations below the fold, target 60fps.

## Dark Mode
- System preference detection on first visit
- Manual toggle saved to localStorage
- Smooth transition between modes
- All components must support both modes
