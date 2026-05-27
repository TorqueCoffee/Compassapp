# 0001 — GA4 script placement in index.html head

- **Status**: Accepted
- **Date**: 2026-05-27

## Context

Needed to add GA4 tracking to the CoffeeVibe PWA. Unlike the Shopify section (which needed a conditional loader to avoid double-loading from theme.liquid), this is a standalone Vercel app — we own the entire page.

## Options considered

- **GTM container** — more flexible for future tag additions, but adds setup overhead and another dashboard to manage
- **Direct gtag in `<head>`** — standard GA4 recommended approach, no extra setup

## Decision

Direct `<script async>` + `gtag('config', ...)` in `<head>`. Simple, standard, no external dependencies beyond Google's CDN.

## Consequences

**Positive:** Zero config overhead; GA4 loads on every page view automatically.
**Negative:** Adding other tags later (e.g. Meta Pixel, Hotjar) means editing index.html each time — GTM would be cleaner at that point.
**When to revisit:** If more than 2-3 tracking/marketing tags are needed, migrate to GTM.
