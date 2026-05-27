# Runbook — Compassapp (coffeevibe.torque.coffee)

## Deploy

Push to GitHub main branch → Vercel auto-deploys.

For large file replacements (index.html is >400 lines): use **Add file → Upload files** in the GitHub UI, not the pencil editor.

## Environment variables (Vercel dashboard)

```
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET    (shpss_... from Shopify Dev Dashboard)
SHOPIFY_STORE_HANDLE     torquecoffees
SUPABASE_URL             https://[project].supabase.co
SUPABASE_ANON_KEY        eyJ...
```

After changing env vars, redeploy manually — existing deployments don't pick up changes.

## GA4 events reference

| Event | When | Key params |
|---|---|---|
| `vibe_session_started` | First puck interaction | `decaf_only` |
| `puck_dropped` | End of drag | `quadrant`, `puck_x`, `puck_y`, `top_coffee`, `decaf_only` |
| `flavor_profile_tapped` | Click compass corner label | `quadrant`, `top_coffee`, `decaf_only` |
| `filter_changed` | Decaf toggle | `filter` (`'decaf'` or `'all'`), `has_interacted` |
| `coffee_card_clicked` | "Meet This Coffee" lightbox open | `coffee_name`, `coffee_handle`, `match_pct`, `quadrant`, `decaf_only` |
| `vibe_shared` | Share button click | `quadrant`, `top_coffee`, `method` (`'native'` or `'clipboard'`) |
