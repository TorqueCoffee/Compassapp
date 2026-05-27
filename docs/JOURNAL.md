# Journal

## 2026-05-27 — Step 1: Google Analytics 4 integration

### Work done

- Added GA4 script (`G-12G71SVD3F`) to `<head>` in `index.html` — standard async gtag pattern
- Added `track()` helper, `QUADRANT_LABELS` map, and `currentQuadrantLabel()` utility in the JS state section
- Wired 6 custom events:
  - `vibe_session_started` — first puck interaction (includes `decaf_only` state)
  - `puck_dropped` — end of drag (`quadrant`, `puck_x/y`, `top_coffee`, `decaf_only`)
  - `flavor_profile_tapped` — click on a compass corner label (`quadrant`, `top_coffee`, `decaf_only`)
  - `filter_changed` — decaf toggle (`filter: 'decaf'|'all'`, `has_interacted`)
  - `coffee_card_clicked` — "Meet This Coffee" lightbox open (`coffee_name`, `coffee_handle`, `match_pct`, `quadrant`, `decaf_only`)
  - `vibe_shared` — share button click (`quadrant`, `top_coffee`, `method: 'native'|'clipboard'`)

### Decisions captured

- [`0001-ga4-in-head.md`](./decisions/0001-ga4-in-head.md)
