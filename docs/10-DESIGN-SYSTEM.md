# Design System — Shree Krishna Collection

> Shared by **storefront** (Astro) and **admin** (React). Both apps import the SAME tokens.
> Goal: clean, modern, premium — "Shopify-grade" but warmer/textile-flavored.
> **No emojis anywhere. SVG icons only.**

---

## 1. Design tokens (source of truth)

These are the canonical values. Implement them as **CSS custom properties** (works in both
Astro and React) AND mirror them in **Tailwind config** so utility classes match.

### 1.1 CSS variables — `tokens.css` (copy into both apps)

```css
:root {
  /* Color — brand */
  --color-primary: #1E3A5F;      /* deep indigo */
  --color-primary-hover: #16304F;
  --color-accent: #C9A227;       /* muted gold */
  --color-accent-hover: #B08F1E;

  /* Color — surfaces */
  --color-bg: #FFFFFF;
  --color-surface: #F7F6F3;      /* warm off-white card bg */
  --color-border: #E5E3DE;

  /* Color — text */
  --color-text: #1A1A1A;
  --color-text-muted: #6B6B6B;
  --color-text-on-primary: #FFFFFF;

  /* Color — status */
  --color-success: #2E7D5B;
  --color-error: #C0392B;
  --color-warning: #B7791F;
  --color-info: #2B6CB0;

  /* Typography */
  --font-heading: "Fraunces", Georgia, serif;
  --font-body: "Inter", system-ui, -apple-system, sans-serif;

  --text-xs: 0.75rem;    /* 12 */
  --text-sm: 0.875rem;   /* 14 */
  --text-base: 1rem;     /* 16 */
  --text-lg: 1.125rem;   /* 18 */
  --text-xl: 1.25rem;    /* 20 */
  --text-2xl: 1.5rem;    /* 24 */
  --text-3xl: 1.875rem;  /* 30 */
  --text-4xl: 2.25rem;   /* 36 */
  --text-5xl: 3rem;      /* 48 */

  /* Spacing scale (4px base) */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.25rem; --space-6: 1.5rem;
  --space-8: 2rem;     --space-10: 2.5rem; --space-12: 3rem;
  --space-16: 4rem;    --space-20: 5rem;   --space-24: 6rem;

  /* Radius */
  --radius-sm: 4px;
  --radius: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadow (subtle, premium — avoid heavy shadows) */
  --shadow-sm: 0 1px 2px rgba(26,26,26,0.05);
  --shadow: 0 1px 3px rgba(26,26,26,0.08), 0 1px 2px rgba(26,26,26,0.04);
  --shadow-lg: 0 8px 24px rgba(26,26,26,0.10);

  /* Layout */
  --max-width: 1280px;
  --header-height: 72px;

  /* Motion */
  --transition: 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 1.2 Tailwind config (mirror — `tailwind.config.js`)

Both apps use Tailwind. Extend the theme to reference the same values so `bg-primary`,
`text-muted`, `font-heading`, etc. exist as utilities:

```js
// tailwind.config.js (shared structure — same in storefront and admin)
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1E3A5F", hover: "#16304F" },
        accent:  { DEFAULT: "#C9A227", hover: "#B08F1E" },
        surface: "#F7F6F3",
        border:  "#E5E3DE",
        ink:     { DEFAULT: "#1A1A1A", muted: "#6B6B6B" },
        success: "#2E7D5B", error: "#C0392B",
        warning: "#B7791F", info: "#2B6CB0",
      },
      fontFamily: {
        heading: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      maxWidth: { content: "1280px" },
      borderRadius: { DEFAULT: "8px", lg: "12px" },
      boxShadow: {
        sm: "0 1px 2px rgba(26,26,26,0.05)",
        DEFAULT: "0 1px 3px rgba(26,26,26,0.08), 0 1px 2px rgba(26,26,26,0.04)",
        lg: "0 8px 24px rgba(26,26,26,0.10)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
```

### 1.3 Fonts
- Load **Inter** and **Fraunces** from Google Fonts via `<link>` with `preconnect`, OR
  self-host (preferred for storefront performance — use `@fontsource/inter` and
  `@fontsource/fraunces`). Self-hosting avoids a render-blocking third-party request,
  which helps Core Web Vitals (LCP).
- Weights: Inter 400/500/600/700. Fraunces 400/500/600 (optical size for display).

---

## 2. Typography rules

| Use | Font | Size | Weight |
|-----|------|------|--------|
| Page H1 / hero | Fraunces | `--text-4xl`/`5xl` | 600 |
| Section H2 | Fraunces | `--text-2xl`/`3xl` | 600 |
| Card title / H3 | Fraunces | `--text-xl` | 500 |
| Body | Inter | `--text-base` | 400 |
| Small / meta | Inter | `--text-sm` | 400 |
| Buttons / labels | Inter | `--text-sm` | 500/600 |
| Price (emphasis) | Inter | `--text-lg`/`xl` | 600 |

Line-height: 1.2 for headings, 1.6 for body. Letter-spacing: slight negative
(`-0.01em`) on large headings only.

---

## 3. Core components (build once, reuse everywhere)

Each frontend implements these. Behavior/markup must match this spec so the two apps feel
consistent. Storefront uses Astro components (+ minimal JS islands); admin uses React.

### Button
- Variants: `primary` (indigo bg, white text), `accent` (gold bg, ink text),
  `secondary` (white bg, border, ink text), `ghost` (transparent), `danger` (error).
- Sizes: `sm` (h-9), `md` (h-11 default), `lg` (h-12).
- States: hover (use `-hover` color), focus (2px accent ring), disabled (50% opacity,
  no pointer), loading (spinner SVG, disabled).
- Radius `--radius`. Min touch target 44px on mobile.

### Input / Select / Textarea
- Use `@tailwindcss/forms` reset. Border `--color-border`, focus ring accent.
- Always paired with a `<label>`. Error state: red border + helper text below.
- Required fields marked with a visible indicator (not just color).

### Card
- `--color-surface` bg, `--radius-lg`, `--shadow-sm`, `--color-border` 1px.
- Hover lift only on interactive cards (product cards): `--shadow` + slight translateY.

### Badge / Tag
- Pill (`--radius-full`), small text. Variants for status (success/warning/error/info)
  and for attributes (intended_use, material).

### Product Card (storefront-specific, see storefront plan for full spec)
- Image (square 1:1, object-cover), title, intended_use badge, price, optional
  the price per metre ("₹X / metre"), optionally "from ₹Y" using the smallest length.

### Modal / Drawer
- Cart is a right-side drawer on desktop, full-screen sheet on mobile.
- Focus-trapped, ESC closes, backdrop click closes, scroll-locked body.

### Toast / Notification
- Top-right (desktop), top-center (mobile). Auto-dismiss 4s. Variants success/error/info.

### Quantity stepper, Image gallery/slider, Pagination, Breadcrumbs, Empty states,
Skeleton loaders, Table (admin) — specced in respective app plans.

---

## 4. Iconography

- **Base set: [Lucide](https://lucide.dev)** (clean, consistent, MIT). Storefront: import
  individual SVGs (tree-shakeable, or inline to avoid JS). Admin: `lucide-react`.
- **Never use emojis.** If a needed icon isn't in Lucide, create a custom SVG following
  these rules:
  - 24×24 viewBox, `stroke="currentColor"`, `stroke-width="1.75"`, `fill="none"`,
    round line caps/joins. This matches Lucide so custom + library icons look uniform.
  - Store custom SVGs in `src/assets/icons/` (storefront) / `src/icons/` (admin).
- Common icons used: search, cart, user, heart, chevrons, plus/minus, trash, edit,
  filter, sort, close (x), check, truck (shipping), printer (sticker), package, tag,
  arrow-right.

### Custom SVGs needed (make these)
1. **Logo mark** — peacock-feather "eye" abstracted into a minimal indigo+gold motif
   (Krishna association). Square, works at 32px.
2. **Logo wordmark** — "Shree Krishna Collection" in Fraunces, with the mark to the left.
   Provide a stacked (mobile) and horizontal (desktop) version.
3. **Cloth/fabric icon** — a folded-fabric glyph for empty states / category default.
4. **Measuring/metre icon** — ruler glyph to denote length options / per-metre pricing.
5. **Stitching icon** — needle & thread, for "get it stitched" messaging.

> Provide each as an `.svg` file AND as an inline component. Keep them optimized (run
> through SVGO; no unnecessary metadata). Document each in `src/assets/icons/README.md`.

---

## 5. Logo specification (for the implementer building it)

```
Mark:  A simplified peacock feather "eye" — an almond/leaf outline (indigo #1E3A5F)
       with an inner droplet (gold #C9A227) and a thin indigo center line.
       Geometric, 2px strokes, balanced in a 32x32 box. Modern, not ornate.

Wordmark (horizontal):
   [mark]  Shree Krishna Collection      <- "Shree Krishna" in Fraunces 600 indigo,
                                            "Collection" in Inter 500 letter-spaced muted,
                                            sitting on a baseline to the right of the mark.

Wordmark (stacked, for mobile/footer):
   [mark]
   Shree Krishna
   COLLECTION

Monochrome variants: all-indigo and all-white (for dark/photo backgrounds) required.
Favicon: just the mark, 32x32 and 16x16, plus a 512 maskable PNG for PWA/manifest.
```

---

## 6. Layout & spacing rules

- Page gutter: 16px mobile, 24px tablet, 32px desktop. Content capped at `--max-width`,
  centered.
- Vertical rhythm between sections: `--space-16` desktop, `--space-12` mobile.
- Grid: product grids are 2-col mobile, 3-col tablet, 4-col desktop. Gap `--space-6`.
- Sticky header (height `--header-height`), shrinks slightly on scroll (storefront).

---

## 7. Responsive breakpoints (Tailwind defaults — use these consistently)

| Name | Min width | Typical device |
|------|-----------|----------------|
| (base) | 0 | phones |
| `sm` | 640px | large phones |
| `md` | 768px | tablets |
| `lg` | 1024px | laptops |
| `xl` | 1280px | desktops |

**Mobile-first**: write base styles for mobile, add `md:`/`lg:` overrides upward. Test
every page at **360, 768, 1024, 1440**. Cart, checkout, product gallery, and admin tables
need explicit mobile treatments (drawers, stacked layouts, horizontal-scroll tables with
sticky first column).

---

## 8. Accessibility checklist (enforce on every screen)
- Semantic landmarks: `header`, `nav`, `main`, `footer`.
- Every image has meaningful `alt` (product images: product name + intended use).
- All interactive elements keyboard-reachable; visible focus ring (accent, 2px).
- Color contrast AA (4.5:1 text). Don't rely on color alone for state.
- Forms: labels tied via `for`/`id`; errors announced (`aria-live`).
- Buttons are `<button>`, links are `<a>` — never a `div` with onClick.
- `prefers-reduced-motion`: disable non-essential animation.
