# PRODUCT.md — Plataforma Delben

## Product Purpose

B2B SaaS quotation platform for Delben, a Colombian carpentry manufacturer with 45 years of history. The platform serves ~10–20 authorized distributors in Colombia, Venezuela, and the USA. Each distributor quotes custom kitchen modules for their end clients; the platform generates both a purchase order to Delben and a quotation document for the end client.

**The primary user is the distributor, not Delben.** Delben's internal team (super_admin, delben_facturacion) uses a separate admin section.

## Users

**Distributor roles (primary)**
- `distribuidor_admin` — manages their own company's team, pricing markup, client quotes
- `distribuidor_costos` — can see cost breakdowns including Delben's cost layer
- `distribuidor_comercial` — can only see final prices, never Delben's internal costs

**Delben internal roles (secondary)**
- `super_admin` — full system access; creates distributors and all Delben users
- `delben_facturacion` — creates internal valoraciones to know exactly what to invoice

## Register

**product** — design serves the product. Clean, purposeful, professional. The tool must feel trustworthy and fast. Distributors use this daily to quote for their clients; every extra second of friction costs real money.

## Brand

- 45 years of Colombian carpentry tradition
- Warm, professional, precise
- Accent: caoba (mahogany) — OKLCH warm amber-brown
- Base: stone neutrals (warm gray family)
- NOT: tech startup, cold blue SaaS, anything that looks "AI-generated"

## Tone

- Spanish throughout the UI
- Concise, professional, direct
- No marketing copy inside the tool — every word earns its place

## Anti-references

- Generic SaaS cream with blue primary buttons
- Purple/blue "AI aesthetic" gradients
- Glassmorphism used decoratively
- Centered-everything layouts
- 3-column identical card grids
- Neon glows or oversaturated accents

## Color strategy: Restrained

Stone neutrals as base. Caoba accent used sparingly (≤10% of visible surface). One accent color maximum.

## Strategic principles

1. Speed is a feature. Quote creation must feel instant.
2. Security is invisible. Role-based access works silently in the background.
3. Numbers must be readable. Use Geist Mono for all monetary values.
4. Trust is built through consistency. Same patterns, same behavior, everywhere.
