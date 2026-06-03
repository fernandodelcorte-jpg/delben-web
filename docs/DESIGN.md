# DESIGN.md — Sistema de Diseño Delben Portal

## Colors

### Base neutrals — stone family (warm gray)
All backgrounds, borders, text hierarchy built from Tailwind's `stone` scale.

| Role | Token | Usage |
|---|---|---|
| Page background | `stone-50` | All portal pages |
| Card / surface | `white` | Cards, nav, sidebar |
| Border default | `stone-200` | Cards, inputs, dividers |
| Border hover | `stone-300` | On hover states |
| Text primary | `stone-900` | Headings, key values |
| Text secondary | `stone-700` / `stone-800` | Labels, names |
| Text muted | `stone-500` | Descriptions, metadata |
| Text placeholder | `stone-400` | Placeholders, empty states |
| Text faint | `stone-300` | Decorative, disabled |

### Caoba — accent (warm mahogany, OKLCH)
```
caoba-50:  oklch(0.97 0.01 50)   — tinted backgrounds
caoba-100: oklch(0.92 0.03 50)   — light highlight fills
caoba-200: oklch(0.84 0.06 50)
caoba-300: oklch(0.73 0.10 50)
caoba-400: oklch(0.63 0.14 50)
caoba-500: oklch(0.54 0.15 45)   — primary accent, icons, selection
caoba-600: oklch(0.48 0.14 42)   — primary button, active links
caoba-700: oklch(0.40 0.12 40)
caoba-800: oklch(0.32 0.09 38)
caoba-900: oklch(0.24 0.06 36)
caoba-950: oklch(0.16 0.04 34)
```

### Status colors (semantic)
- Amber: pending / borrador states — `amber-100 text-amber-700`
- Green: success / facturado — `emerald-50 text-emerald-700`
- Blue: active / en_proceso — `blue-50 text-blue-600`
- Red: error / perdido — `red-50 text-red-600`
- Stone: inactive — `stone-100 text-stone-500`

## Typography

### Fonts
- **UI / body:** Geist Sans (`var(--font-geist-sans)`) — clean, modern, excellent at small sizes
- **Monospace / numbers:** Geist Mono (`var(--font-geist-mono)`) — all monetary values use `font-mono tabular-nums`

### Scale
| Role | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-stone-900` |
| Section title | `text-lg font-semibold text-stone-900` |
| Card title | `text-sm font-semibold text-stone-800` |
| Label | `text-xs font-medium text-stone-600` |
| Body | `text-sm text-stone-700 leading-relaxed` |
| Muted detail | `text-xs text-stone-400` |
| Eyebrow | `text-xs font-medium tracking-[0.15em] uppercase text-caoba-600` |
| Monetary value | `font-semibold tabular-nums` (font-mono for large values) |

## Layout

### Portal (distributor view)
- Full width with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10`
- Top navigation bar: `h-14 border-b border-stone-200 bg-white`
- Content background: `bg-stone-50`

### Admin (Delben internal)
- Sidebar: `w-52 border-r border-stone-200 bg-white`
- Content: `max-w-5xl mx-auto px-8 py-8`
- Content background: `bg-stone-50`

## Components

### Cards
- Default: `rounded-xl border border-stone-200 bg-white overflow-hidden`
- Interactive: add `hover:border-stone-300 transition-colors`
- No shadow by default — reserve `shadow-sm` for hover feedback only

### Buttons
**Primary (caoba):** `rounded-lg bg-caoba-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-caoba-700 transition-colors tactil`
**Secondary (border):** `rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-colors tactil`
**Dark:** `rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-colors tactil` — use for selector toggles (structure type, facade type), NOT for primary CTA actions
**Ghost:** `text-sm text-stone-500 hover:text-stone-800 transition-colors tactil`

### Inputs
```
rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm
outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100
transition-colors
```
Use `transition-colors` (not `transition-all`) — only border color and ring change on focus.

### Badges / Pills
- Rounded full, `px-2.5 py-1 text-xs font-medium`
- Use semantic status colors

### Dividers
- `divide-y divide-stone-100` for list items within a card
- `border-b border-stone-100` for card section headers

## Animation

### Easing curves
```css
--ease-out-fuerte: cubic-bezier(0.23, 1, 0.32, 1);   /* entrances */
--ease-in-out-fuerte: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen movement */
```

### Keyframes
```css
aparecer:           opacity 0→1, translateY 5px→0    (duration: 0.2s)
deslizarse-derecha: opacity 0→1, translateX 16px→0   (duration: 0.2s)  ← side panels
desplegarse:        opacity 0→1, scale 0.96→1 + translateY -4px→0 (150ms) ← dropdowns
sacudir:            horizontal shake for validation errors
```

### Utility classes
- `.tactil` — `transition: transform 160ms var(--ease-out-fuerte); :active { scale(0.97) }` — applies to all pressable elements
- `.transicion-entrada` — coordinated opacity + transform transition
- `.skeleton` — shimmer gradient (linear, sweeping left→right) for placeholder loading elements

### Timing guidelines
| Element | Duration |
|---|---|
| Button press | 160ms (via `.tactil`) |
| Dropdown entry | 150ms |
| Side panel entry | 200ms (`animate-deslizarse-derecha`) |
| Page element stagger | 40ms per item, cap at 5 items (items 6+ no delay) |
| Skeleton shimmer | 1.6s linear infinite |
| Toast / notification | 250ms enter, 200ms exit |

### Stagger pattern
```tsx
<div
  className="animate-aparecer"
  style={{ animationDelay: `${Math.min(index, 4) * 40}ms` }}
/>
```
Cap stagger at 5 items (160ms max). Items 6+ appear without delay.

## Skeleton loaders
Match the exact shape of the content being loaded.
Apply `.skeleton` class to each individual placeholder element (NOT the wrapper container).
Never use `animate-pulse` — it was replaced by `.skeleton` shimmer.
Never use `CircleNotch` spinner for page-level content loads.
Reserve the circular spinner (`border-t-caoba-600 animate-spin`) for:
- Initial auth check (full-page)
- Inline button operations (small, within the button)

## Icons
Library: `@phosphor-icons/react`
- Default weight: `regular`
- Active / selected: `fill`
- Size: 15–16px for nav/UI, 13px for inline actions, 18–20px for empty states

## Empty states
```
rounded-xl border border-dashed border-stone-200 bg-white py-24 text-center
Icon: size 32, text-stone-300
Title: text-sm font-medium text-stone-400
Subtitle: text-xs text-stone-300
CTA: inline text link
```
