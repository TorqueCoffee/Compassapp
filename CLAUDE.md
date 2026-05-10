# Torque Coffee — Internal Web App Context

This file gives Claude Code persistent context for all Torque Coffee internal web projects. Read this before writing any code, SQL, or deployment instructions.

For all visual design, CSS, and animation work, read compass-analog-design-SKILL.md before writing code.
---

## Stack

| Layer | Service | Notes |
|---|---|---|
| Frontend hosting | Vercel (Free Hobby) | Auto-deploys on GitHub push |
| Database + realtime | Supabase (Free tier) | Postgres + realtime websockets |
| Source control | GitHub (TorqueCoffee org) | |
| Shopify store | torquecoffees.myshopify.com | Vendor filter = "Torque Coffees" |
| Auth model | Secret URL token | No login — shared bookmarked URL |

---

## File Structure (all repos)

```
/
├── api/
│   └── [function-name].js   ← Vercel serverless functions (CommonJS only)
├── index.html                ← Single-page app
└── package.json              ← Required for node-fetch
```

**Critical:** Everything at repo root. Never put files in subfolders. Delete `vercel.json` if it causes pattern errors — Vercel auto-detects `api/*.js`.

---

## Vercel

- Root Directory: empty, Framework: Other, Build Command: none, Output Directory: none
- Always redeploy after changing env vars (existing deployments don't pick up changes)
- Serverless functions must use CommonJS — ES module syntax (`export default`) causes 404s

**Serverless function format:**
```javascript
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // handler code
}
```

**package.json:**
```json
{ "dependencies": { "node-fetch": "2.6.9" } }
```

**Environment variables (set in Vercel dashboard):**
```
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET    (shpss_... from Shopify Dev Dashboard)
SHOPIFY_STORE_HANDLE     torquecoffees
SUPABASE_URL             https://[project].supabase.co
SUPABASE_ANON_KEY        eyJ... publishable key
```

---

## Shopify API

**Auth:** Client Credentials Grant (new as of Jan 2026). Legacy `shpat_` tokens no longer issued.

```javascript
const tokenRes = await fetch(
  `https://${SHOPIFY_STORE_HANDLE}.myshopify.com/admin/oauth/access_token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET
    })
  }
)
const { access_token } = await tokenRes.json()
```

- API version: `2025-01`
- Base URL: `https://torquecoffees.myshopify.com/admin/api/2025-01`
- Vendor filter: `item.vendor === 'Torque Coffees'` (capital T and C, with s)
- Store handle: `torquecoffees` (with s) — NOT `torque`
- Always handle Shopify pagination via Link headers

**CRITICAL:** Shopify vendor filter returns empty silently with no error. NEVER use Shopify data as the source for UI dropdowns. Shopify is for order aggregation only. All UI lists must source from Supabase.

---

## Supabase

**Anon key only in client code.** Never use service role key client-side.

**Table creation checklist — never skip any step:**
```sql
-- 1. Create table
create table my_table (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  team_id text not null,
  -- columns
);

-- 2. Enable RLS (always explicit)
alter table my_table enable row level security;

-- 3. Add anon policies
create policy "anon read" on my_table for select using (true);
create policy "anon insert" on my_table for insert with check (true);
create policy "anon update" on my_table for update using (true);
create policy "anon delete" on my_table for delete using (true);

-- 4. Enable realtime (if needed)
alter publication supabase_realtime add table my_table;

-- 5. Index team_id and any frequently filtered columns
create index on my_table (team_id);
```

**THE MOST IMPORTANT RULE:** Supabase returns `[]` — not an error — when RLS blocks a query. If a query returns unexpected empty results, check RLS policies before debugging JS.

**Multi-tenancy:** Use `team_id text not null` on all tables. Always filter with `.eq('team_id', TEAM_ID)`. Current value: `'torque2026'`. Verify a table has `team_id` column before inserting it — Supabase behavior on unknown fields varies.

**Column types:**
- Primary key: `uuid default gen_random_uuid()` (never serial int)
- Timestamps: `timestamptz default now()` (always with timezone)
- Text: `text` (no varchar needed)
- Counts/qty: `integer`
- Ratios/prices: `numeric(10,4)`
- Booleans: `boolean default false` (never 0/1 or text)

**JS client patterns:**
```javascript
// Always fallback — Supabase returns null (not []) when empty or RLS blocks
const { data } = await sb.from('table').select('*')
const rows = data || []

// Upsert
await sb.from('table').upsert({ id, field: value }, { onConflict: 'id' })

// Realtime
sb.channel('channel_name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'my_table' }, () => reload())
  .subscribe()
```

**Silent failure modes:**

| Symptom | Cause | Fix |
|---|---|---|
| Query returns `[]`, no error | RLS blocking anon access | Add anon policy |
| Realtime not firing | Table not in publication | `alter publication supabase_realtime add table ...` |
| Insert silently ignored | RLS insert policy missing | Add anon insert policy |
| Old data after schema change | Client caches schema | Hard refresh browser |
| Upsert creates duplicates | `onConflict` col not in unique constraint | Add unique constraint |

---

## JavaScript Patterns

Apps are single `index.html` files. Vanilla JS + Supabase CDN. No build step, no framework, no bundler.

**Philosophy:** Just enough code. Explicit over clever. One source of truth (Supabase). No dependencies beyond Supabase CDN.

**Global state:**
```javascript
// Mutable state — set by load functions, read by render functions
let planData = []
let blendMatrix = []
let greenSettings = []     // master coffee list — single source of truth
let roastingProgress = {}
let staleBlends = []

// Constants
const TEAM_ID = 'torque2026'
const SUPABASE_URL = 'https://[project].supabase.co'
const SUPABASE_ANON_KEY = 'eyJ...'
```

Rules: load functions set globals; render functions only read them; never mutate globals inside render functions.

**Async patterns:**
```javascript
// Always async/await — never mix with .then() chains
async function loadBlends() {
  const [{ data: bm }, { data: gs }] = await Promise.all([
    sb.from('blend_matrix').select('*').order('product_name'),
    sb.from('green_coffee_settings').select('*').order('component_name')
  ])
  blendMatrix = bm || []
  greenSettings = gs || []
}

// Always await render functions
if (tab === 'blends') await renderBlendEditor()  // not renderBlendEditor()
```

**Render functions:** Use `innerHTML` for full section re-renders. One global array → full re-render cycle. Never manipulate individual DOM nodes across the codebase.

**Dropdown pattern — always show current saved value:**
```javascript
const currentOption = `<option value="${saved}" selected>${saved}</option>`
const options = sourceList
  .filter(n => n !== saved)
  .map(n => `<option value="${n}">${n}</option>`)
  .join('')
```

**Event handlers:** Use inline `onclick`/`onchange` on dynamically generated HTML. Use `addEventListener` only for static elements that exist on page load.

**Error handling:**
```javascript
const { error } = await sb.from('table').update({ field: value }).eq('id', id)
if (error) {
  console.error('Update failed:', error)
  return  // don't re-render with stale state
}
await renderSection()
```

**Don't fetch inside loops.** Batch all reads before processing.

**Naming conventions:**

| Thing | Convention |
|---|---|
| Load functions | `loadBlends()`, `loadPlan()` |
| Render functions | `renderBagging()`, `renderBlendEditor()` |
| Update handlers | `updateComponent()`, `updateOrigin()` |
| Adjust counters | `adjustBagged()`, `adjustBatches()` |
| Add rows | `addComponent()`, `addNewBlend()` |
| Delete rows | `deleteBlend()`, `deleteOrigin()` |
| Toggle state | `toggleDone()`, `toggleLock()` |
| Global arrays | camelCase plural: `planData`, `blendMatrix` |
| Constants | SCREAMING_SNAKE: `TEAM_ID`, `SUPABASE_URL` |

**What not to do:** No classes, no module imports/exports, no third-party UI libs, no build step, no TypeScript, no `var`, no `.then()` chains, no fetching from Shopify in render functions, no abstract helper layers.

---

## Render Function Rules

**Rule 1:** Never depend on Shopify data in render functions. Shopify calls belong in `refreshOrders()` only.

**Rule 2:** Declare data dependencies at the top of every render function and verify each is populated before the function runs.

**Rule 3:** Dropdown options must always include the current saved value (see dropdown pattern above).

**Rule 4:** `green_coffee_settings.component_name` is the master coffee list. Never use Shopify product titles for dropdown population.

**Rule 5:** Async render functions must be fully awaited by callers.

**Rule 6:** Silent hang = unresolved promise, not a thrown error. If UI is stuck on "Loading..." with no console errors, step through each await manually in the console.

---

## Debugging Protocol

Run these steps in order when a UI component shows wrong data or fails to render.

```javascript
// Step 1 — Verify raw data in Supabase
fetch('https://[project].supabase.co/rest/v1/[table]?select=*&apikey=[anon_key]')
  .then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))

// Step 2 — Verify JS query in app context
(async()=>{ const {data} = await sb.from('[table]').select('*'); console.log(data) })()

// Step 3 — Run render function and catch errors
renderMyFunction().catch(e=>console.error(e))

// Step 4 — Step through render internals
(async()=>{
  await loadBlends()
  console.log('blendMatrix:', blendMatrix.length, 'greenSettings:', greenSettings.length)
})()

// Step 5 — Inspect live DOM
document.getElementById('targetEl').innerHTML.substring(0,300)
```

Type `allow pasting` in Chrome console first to enable paste.

---

## Roast Scheduler (CoffeePlanner)

- Live URL: `https://coffee-planner-ashen.vercel.app`
- GitHub: `https://github.com/TorqueCoffee/CoffeePlanner`

**Tables:** `daily_plan`, `blend_matrix`, `green_coffee_settings`, `roasting_progress`, `archived_plan`

**Data model:**
- `qty_needed` = recalculated from scratch on every Shopify pull
- `qty_bagged` = preserved across pulls, only goes up
- `qty_remaining` = max(0, qty_needed - qty_bagged)
- Locked rows: `qty_needed` never overwritten by Shopify pull

**Roasting math:**
- Shrinkage: green lbs = roasted lbs × 1.176 (= 1/0.85)
- Batches: ceil(green lbs / batch_size)
- Default batch size: 8 lbs (decaf = 7 lbs). Roaster: 6kg drum.

**Coffee naming:** ALL names must exactly match `green_coffee_settings`. No shortening, no stripping of "Plus", no aliases. `Bombón` has accent. Vendor = `Torque Coffees` (with s).

**Blends:** Cocoa Drop, Dark Drop, Honey Drop, Gum Drop, Decaf Drop, Demi Drop

**Bag weights:** 12oz Bag = 0.75 lbs | 2lb Bag = 2 lbs | 5lb Bag = 5 lbs | 45lb Bulk Box = 45 lbs | 8 xPods = 0 (bagging only)

---

## Shopify Metafields

All Torque custom metafields use the `custom.torque_*` namespace (e.g., `custom.torque_compass_x`, `custom.torque_compass_y`, `custom.torque_postcard_image`). When querying via REST API with `?namespace=custom`, the returned `m.key` value is the part after `custom.` (e.g., `torque_compass_x`).

---

## Code Style

Skip explanations. Write the code, show the diff, move to the next step. Minimize token usage.

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| 404 on `/api/shopify-token` | ES module syntax or vercel.json pattern mismatch | Use `module.exports`, delete vercel.json |
| `shpss_` token not working as API token | New Shopify auth flow | Use client credentials grant |
| Supabase double path `/rest/v1/rest/v1/` | SUPABASE_URL includes `/rest/v1` suffix | Use only `https://[project].supabase.co` |
| Shopify returns homepage HTML | Wrong store handle | Handle is `torquecoffees` not `torque` |
| Env vars not taking effect | Vercel caches old deployment | Redeploy after every env var change |
| Supabase returns `[]` with no error | RLS policy missing | Add anon policies |
| Blend dropdown shows one option | greenSettings empty at render time | Await loadBlends() before template |
| UI stuck on "Loading..." no errors | Async render function hanging | Step through internals manually |
| Coffees missing from dropdowns | Shopify used as dropdown source | Use green_coffee_settings, never Shopify |
| Wrong file deployed silently | GitHub web editor failed on large file | Use Add file → Upload files |
| `team_id` insert error | Table doesn't have team_id column | Check table schema first |

---

## New App Workflow

1. Create GitHub repo under TorqueCoffee org
2. Add `index.html` placeholder at root → commit
3. Create Vercel project → import from GitHub → deploy
4. Add environment variables to Vercel dashboard
5. Create Supabase tables → enable RLS → add anon policies immediately
6. Build serverless function in `api/` using CommonJS format
7. Add `package.json` with node-fetch dependency
8. Build frontend as single `index.html` with Supabase JS from CDN
9. All UI dropdowns source from Supabase tables — never from Shopify
10. Test `/api/[function]` directly in browser before testing full UI
11. Upload via Add file → Upload files — verify after every upload

**GitHub upload rule:** Web editor breaks silently on large files (>400 lines). Always use Add file → Upload files for full-file replacements. Pencil editor only for small targeted edits (<20 lines). After every upload, verify by checking a key function in GitHub.
