# Homebase → Instacart integration — Design & Build Plan

**Goal:** Let anyone in the household turn the current grocery list into a
pre-populated Instacart cart with one click ("Shop on Instacart"), without
building or maintaining our own product catalog, price data, or checkout flow.

**Decisions locked in:**
- We hand off to Instacart's own web/app checkout — we do **not** attempt a
  true in-app purchase. Instacart's public API does not offer that (see §2).
- Use the **Create Shopping List Page** endpoint (a.k.a. "Products Link API")
  to turn our `groceryItems` rows into a single Instacart URL, opened in a new
  tab/webview.
- Server-side only: the Instacart API key never reaches the browser. A server
  action builds the request and returns the resulting URL to the client.
- v1 scope: unchecked grocery items → one shopping-list link, surfaced as a
  button on `/groceries`. No recipe pages, no retailer selection, no order
  tracking.

---

## 1. What "integrating with Instacart" can mean here

Instacart's **Developer Platform (IDP)** exposes two relevant products:

1. **Create Shopping List Page / "Products Link" API** — takes a list of line
   items, returns a hosted Instacart URL. Opening it lets the shopper pick a
   nearby retailer, has the items auto-added to cart (best-effort product
   matching), and finishes checkout entirely on Instacart's site/app. This is
   the only piece of the public API surface that touches carts/products.
2. **Recipe page API** (`create_recipe_page`) — same mechanism, styled as a
   recipe with ingredients. Not relevant to a grocery-list app.

There is **no public API for direct in-app ordering, cart mutation on an
existing Instacart account, price lookup, or order status** in the Developer
Platform docs we could reach. Everything funnels through the "generate a link,
open it, user finishes on Instacart" pattern. This matches what Instacart
documents as the intended integration shape — the FAQ explicitly frames this
as deep-linking, not embedded commerce.
(https://docs.instacart.com/developer_platform_api/faq/)

**Conclusion:** the realistic feature is a **"Shop on Instacart" button**, not
a checkout integration. That's a good fit for Homebase — no PCI/payment
surface, no need to hold retailer/pricing data, and it's a small, revertible
addition.

---

## 2. API selected: Create Shopping List Page

- Docs: https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
- Concept overview: https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list/
- Endpoints:
  - Dev/sandbox: `POST https://connect.dev.instacart.tools/idp/v1/products/products_link`
  - Prod: `POST https://connect.instacart.com/idp/v1/products/products_link`
- Headers: `Authorization: Bearer <API-key>`, `Content-Type: application/json`, `Accept: application/json`

Request body (fields we'd use; `?` = optional):

```json
{
  "title": "Homebase grocery list",
  "image_url"?: "string",
  "link_type": "shopping_list",
  "expires_in"?: 1,               // days, max 365
  "instructions"?: ["string"],
  "line_items": [
    {
      "name": "string (required)",
      "quantity"?: 1.0,            // deprecated in favor of line_item_measurements
      "unit"?: "each",             // deprecated in favor of line_item_measurements
      "display_text"?: "string",
      "line_item_measurements"?: [ { "quantity": 2, "unit": "lb" } ],
      "filters"?: {
        "brand_filters"?: ["string"],
        "health_filters"?: ["ORGANIC", "GLUTEN_FREE", "FAT_FREE", "VEGAN", "KOSHER", "SUGAR_FREE", "LOW_FAT"]
      }
    }
  ],
  "landing_page_configuration"?: {
    "partner_linkback_url"?: "string",
    "enable_pantry_items"?: false
  }
}
```

Response:

```json
{ "products_link_url": "https://...?aff_id=...&offer_id=...&affiliate_platform=idp_partner" }
```

Notes confirmed from docs:
- `quantity`/`unit` directly on a line item are **deprecated**; use the
  `line_item_measurements` array instead
  (https://docs.instacart.com/developer_platform_api/api/units_of_measurement/).
- Only a fixed unit vocabulary is accepted (volume: cups, fl oz, gal, mL, L,
  pt, qt, tbsp, tsp; weight: g, kg, lb, oz; count: each, bunch, can, ear,
  head, size descriptors). Unsupported units silently fail quantity matching.
- Matching is **best-effort by name/measurement/UPC/brand** — Instacart
  explicitly does not guarantee a match, and SKU numbers are not supported as
  a matching key (FAQ, same URL as above).
- Directing the link to a specific merchant/retailer isn't currently
  supported — the shopper picks the retailer on Instacart's side.
- Links can carry a `partner_linkback_url` so Instacart can send the user back
  to Homebase after shopping (e.g. `/groceries` again).

---

## 3. Auth & onboarding (what the user has to do before any code runs)

This is the part that blocks a same-day build:

1. **Apply for developer access** at
   https://www.instacart.com/company/business/developers — this is a real
   application/approval process, not a self-serve signup.
   (https://docs.instacart.com/developer_platform_api/get_started/overview)
2. Docs state **average time from access request → demo approval → production
   key is ~30–40 days.** A dev/sandbox key is presumably available sooner
   (unconfirmed) for building against `connect.dev.instacart.tools`, but we
   could not verify from public docs whether dev-key issuance is instant or
   also gated by the same approval queue.
3. Once approved, keys are created in an Instacart Developer Dashboard: choose
   **Development or Production** environment and a permission level
   (**read-only / read-write / admin**) per key
   (https://docs.instacart.com/developer_platform_api/get_started/api-keys).
   For this feature we only ever need to *create* a shopping-list link — no
   read scope needed, so request the minimum write-capable tier once we know
   how granular scopes actually are (docs don't spell out which tier
   `products_link` requires — **needs confirmation during onboarding**).
4. **Unconfirmed / to verify with Instacart during signup:** whether a small
   self-hosted single-household hobby app like Homebase is an eligible
   applicant at all. The developer platform's public materials are pitched at
   businesses/publishers (recipe sites, meal-kit services, grocery apps), not
   individuals. This is the single biggest open risk to this whole plan — see
   §8.
5. **Regional availability:** Instacart itself only covers US/Canada
   metros. Park Slope/Brooklyn is well within Instacart's marketplace
   footprint, so no concern for actual grocery delivery — the open question
   is developer-account eligibility, not delivery region.

No OAuth is involved on Instacart's side for this endpoint — it's a static
bearer API key we hold server-side, not a per-user token. This is simpler
than the MCP/OAuth work in `docs/mcp-oauth-plan.md` (that flow governs who can
call *our* server; Instacart's key just lets *our server* call Instacart, and
is the same for every household using this Homebase instance).

---

## 4. Data mapping: `groceryItems` → Instacart `line_items`

| Homebase field (`groceryItems`) | Instacart `LineItem` field | Notes |
|---|---|---|
| `name` (free text) | `name` | Direct pass-through. Matching quality depends entirely on how close our free text is to a real product name (e.g. "milk" matches fine; "the good olive oil" won't). |
| `qty` (free text, e.g. "2 lbs", "1 dozen") | `line_item_measurements: [{quantity, unit}]` | **Gap:** our `qty` is an unstructured string, Instacart wants a numeric `quantity` + a unit from its fixed vocabulary. Needs a best-effort parser (regex for `<number> <unit>`) with graceful fallback to omitting measurement (defaults to qty 1, unit "each") when unparseable. |
| `category` (our 6 aisle buckets) | *(no direct field)* | Not part of the line-item schema — Instacart does its own category/aisle mapping internally. We simply don't send it. |
| `checked` | *(filter, not sent)* | Only unchecked items should be included in the link — checked items are "already have it." |
| `isStaple` | *(not sent)* | No behavior difference on Instacart's side; still just a `name`. |
| `sourceMealId` | *(not sent)* | Could optionally feed `instructions` (e.g. "For: Tuesday's tacos") but not required for v1. |
| — | `filters.brand_filters`, `filters.health_filters` | Nothing in our schema maps to these today (no brand/dietary fields on grocery items). Leave unset in v1. |

**Biggest structural gap:** we store one flat free-text name per item; a real
grocery-matching integration (brand, size, org.) would need a native input
richer than a single text field. Not worth adding UI for v1 — ship the naive
mapping first and see how well Instacart's fuzzy matching does in practice.

---

## 5. Architecture

Keep it a single new module, no schema changes required for v1 (no new
tables — the API is stateless from our side, we just proxy a request).

- **`src/lib/instacart.ts`** (new) — pure function, no DB:
  ```ts
  export async function buildShoppingListUrl(items: { name: string; qty: string | null }[]): Promise<string>
  ```
  Builds the request body per §2/§4, calls
  `INSTACART_API_BASE_URL + "/idp/v1/products/products_link"` with the bearer
  key from `process.env.INSTACART_API_KEY`, returns `products_link_url`.
  Throws/returns null on non-2xx so the caller can show an error instead of a
  dead button.

- **`src/app/(app)/groceries/actions.ts`** — add a `"use server"` action:
  ```ts
  export async function getInstacartLink() {
    const { householdId } = await requireHousehold();
    const items = await db.select({ name: groceryItems.name, qty: groceryItems.qty })
      .from(groceryItems)
      .where(and(eq(groceryItems.householdId, householdId), eq(groceryItems.checked, false)));
    if (items.length === 0) return null;
    return buildShoppingListUrl(items);
  }
  ```
  Same household-scoping guard as every other query in this file — no new
  invariant to worry about, since this action only *reads* groceries and
  never writes.

- **UI** (`src/app/(app)/groceries/page.tsx` or a small client component) —
  "Shop on Instacart" button per the CTA branding spec (§7): on click, calls
  the server action, then `window.open(url, "_blank")`. Disable if there are
  zero unchecked items. Show a toast on failure (API down, key missing,
  network error) rather than a silent no-op.

- **Env:** `INSTACART_API_KEY`, `INSTACART_API_BASE_URL` (defaults to the prod
  host; overridden to `connect.dev.instacart.tools` in dev/staging). Key
  lives only in server env, never sent to the client, never logged.

- **Future MCP tangent (no work now):** once `docs/mcp-oauth-plan.md`'s
  refactor lands, `buildShoppingListUrl` + the read query above would compose
  into a `get_instacart_link` MCP tool trivially — it's already a `ctx`-free,
  household-scoped read + one outbound call, same shape as the other `src/lib/*`
  functions that plan proposes. Not doing this now; just noting the seam
  lines up.

---

## 6. Phased implementation plan

- **P0 — Access:** apply for Instacart developer access; get dev API key. This
  is the long pole (weeks, not hours) and is a manual, out-of-band step for
  the user — nothing to build until a key exists. **Acceptance:** a working
  dev-environment API key in hand, confirmed with a raw `curl` against
  `connect.dev.instacart.tools`.
- **P1 — Library function:** `src/lib/instacart.ts` with `buildShoppingListUrl`,
  a `qty` string → `{quantity, unit}` parser (small allowlist of common units:
  lb, oz, g, kg, each, dozen→12 each, gal, qt, pt, cup, tbsp, tsp), and unit
  tests for the parser's happy/fallback paths. **Acceptance:** function
  returns a real `products_link_url` when called against the dev endpoint
  with a hand-built item list.
- **P2 — Server action + UI:** `getInstacartLink` action, "Shop on Instacart"
  button on `/groceries` per Instacart's CTA spec (§7), loading/disabled/error
  states. **Acceptance:** clicking the button on a household with unchecked
  items opens a real Instacart shopping-list page pre-populated with those
  items (verified manually against the dev key/sandbox).
- **P3 — Polish:** `partner_linkback_url` back to `/groceries`; `expires_in`
  set to something short (e.g. 7 days) since these are meant to be used
  immediately, not archived; empty-state messaging when there's nothing
  unchecked. **Acceptance:** link expires as configured; returning from
  Instacart via the linkback lands back on the grocery page.
- **P4 — Production cutover:** swap to the prod API key/host once Instacart
  approves it; add the required attribution/branding review if Instacart asks
  for one before go-live (see §7). **Acceptance:** feature works end-to-end
  against `connect.instacart.com` with the production key.

---

## 7. Security / ToS / branding checklist

- [ ] `INSTACART_API_KEY` server-side only (env var, never in client bundle,
      never logged in request/error traces).
- [ ] Household-scoped read before building the link — reuse the existing
      `requireHousehold()` + `eq(householdId)` guard already used everywhere
      else in `groceries/actions.ts`; no new data-access pattern introduced.
- [ ] CTA button matches Instacart's design spec exactly — approved copy
      ("Shop ingredients" / "Shop on Instacart"), full-color logo at 22px,
      one of the three approved color variants, no altered colors/logo.
      (https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_design/)
- [ ] Public messaging about the integration (if any — e.g. a changelog post)
      follows Instacart's developer messaging guidelines (trademark usage
      rules). (https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_messaging/)
- [ ] Review Instacart's Terms and Policies section in full before going to
      production — only skimmed via FAQ here, not read end-to-end.
      (https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_guidelines)
- [ ] Confirm we're not required to expose retailer selection, pricing, or
      order-status data we don't have — the API doesn't return any of that,
      so no accidental data leakage is possible, but worth confirming no ToS
      clause expects us to disclose fulfillment terms to the user in-app.
- [ ] Rate limits: **not found in public docs** — treat as unknown until
      confirmed at signup; don't build a bulk/automated calling pattern (e.g.
      no auto-refresh) against this endpoint.

---

## 8. Open questions / risks / unknowns

- **Eligibility (biggest unknown):** can a single self-hosted household app
  even get approved for developer access, or is IDP gated to companies with a
  registered business? Public docs don't say. **Needs a direct answer from
  Instacart during the application** — worth applying early since answer
  gates everything else, and the ~30-40 day approval window means this should
  start now if wanted, independent of when P1-P4 get built.
- **Dev-key turnaround:** unclear if a sandbox/dev key is available faster
  than the quoted 30-40 days for production, or gated behind the same review.
- **Permission tier for `products_link`:** the API-keys doc describes
  read-only/read-write/admin tiers but doesn't say which tier the shopping-
  list endpoint requires. Assume read-write; confirm at key-creation time.
- **Rate limits & pricing:** neither appears in the public docs we could
  reach. Given usage here is "a handful of households click a button
  occasionally," this is unlikely to matter, but worth asking Instacart
  directly since it affects whether this is free or plan-gated.
- **Match quality:** we have no way to test real match rates for our
  household's actual free-text item names until we have a working key — the
  parser and any name-cleanup heuristics (P1) may need tuning after seeing
  real Instacart-side match results.
- **Branding review:** unclear whether Instacart requires a pre-launch review
  of the actual button implementation, or if following the published spec is
  sufficient self-certification. Docs read like the latter but this isn't
  explicit.
- **`partner_linkback_url` reliability:** not verified whether Instacart
  reliably redirects back after checkout completion, abandonment, or both —
  worth checking in the dev sandbox during P3 before promising that UX.
