# Flick — End-to-End Application State Report

> Repo: `C:\SaaS\hello-neighbors`
> Product: **Flick — "Be here. Find people."** (ambient social layer for physical reality)
> Snapshot date: 2026-06-25
> Author of report: auto-generated deep audit of every file in the working tree
> Companion: a slimmer `CODEBASE_REPORT.md` lives at the repo root (this file goes deeper — actual code, controls, contracts, and end-to-end flows)

---

## 0. Table of contents

1. [Product snapshot](#1-product-snapshot)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Tech stack & versions](#3-tech-stack--versions)
4. [Runtime topology — what runs where](#4-runtime-topology--what-runs-where)
5. [Request lifecycle — from URL to pixel](#5-request-lifecycle--from-url-to-pixel)
6. [Routing map (all 15 files)](#6-routing-map-all-15-files)
7. [Bootstrap: from cold load to first paint](#7-bootstrap-from-cold-load-to-first-paint)
8. [Authentication subsystem](#8-authentication-subsystem)
9. [Supabase backend — schema, RPCs, realtime, RLS](#9-supabase-backend--schema-rpcs-realtime-rls)
10. [End-to-end user journey](#10-end-to-end-user-journey)
11. [Page-by-page deep dive](#11-page-by-page-deep-dive)
12. [Product components](#12-product-components)
13. [Hooks, libraries, integrations](#13-hooks-libraries-integrations)
14. [Design system, styling, motion](#14-design-system-styling-motion)
15. [PWA / offline / push](#15-pwa--offline--push)
16. [Safety, trust, monetisation](#16-safety-trust-monetisation)
17. [Build, deploy, observability](#17-build-deploy-observability)
18. [Environment variables & secrets](#18-environment-variables--secrets)
19. [File inventory & metrics](#19-file-inventory--metrics)
20. [Known gotchas, TODOs, and implicit contracts](#20-known-gotchas-todos-and-implicit-contracts)

---

## 1. Product snapshot

**Flick** is a mobile-first Progressive Web App whose single job is to make the people already near you *discoverable* — but only if the feeling is mutual, only for a bounded amount of time, and only if you're physically co-located. It is *not* a feed, *not* a swipe app, *not* a profile marketplace.

The product primitives:

| Primitive          | What it is                                                                                       | Lifetime                            |
|--------------------|--------------------------------------------------------------------------------------------------|-------------------------------------|
| **Profile**        | `display_name`, `avatar` (DiceBear SVG / gradient fallback), `vibe` (1-line bio), `interests[]`   | Permanent until account deletion    |
| **Signal**         | A presence broadcast: "I'm here and open to [coffee / walk / work / food / drink / talk / read / music]" + optional note + radius + duration | 15–180 min, auto-expires (default 60 min) |
| **Wave**           | A "yes, let's connect" gesture on someone else's signal                                          | Permanent (creates match instantly) |
| **Match**          | A bidirectional, 2-hour chat window with a single other user                                     | Hard-expiry at 2 h                  |
| **Keep-in-touch**  | Optional "I'd like to stay connected past the 2-hour window"                                      | If mutual, creates a permanent **Connection** |
| **Connection**     | A permanent, archived relationship (chat history retained 7 days then auto-deleted)              | Permanent (until either user blocks/deletes) |
| **Block / Report** | One-tap safety controls; blocks are bidirectional for signals; reports are reviewed by humans    | Permanent (block until user unblocks manually) |

The emotional positioning: "Be here. Find people." / "The people you were meant to meet are already near you."

---

## 2. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (mobile PWA)                      │
│  ┌──────────────────────┐  ┌────────────────────┐                 │
│  │  React 19 SPA/SSR    │  │ Service Worker     │                 │
│  │  TanStack Start/Router│  │ public/sw.js       │                 │
│  │  + React Query       │  │  - shell cache     │                 │
│  │  + framer-motion     │  │  - nav network-1st │                 │
│  └──────────┬───────────┘  └────────────────────┘                 │
│             │ anon-key fetch + Bearer JWT                         │
└─────────────┼──────────────────────────────────────────────────────┘
              │
              │  HTTPS (REST + Realtime WebSocket)
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Supabase (project nqtwslncjxbekupkvazu)        │
│  ┌──────────────────────┐  ┌────────────────────┐                 │
│  │  Postgres + PostGIS  │  │ Realtime           │                 │
│  │  + pgcrypto          │  │  signals           │                 │
│  │  Tables + RPCs + RLS │  │  matches           │                 │
│  │  Auth (email+pw /    │  │  messages          │                 │
│  │   Google OAuth)      │  │  message_reactions │                 │
│  └──────────────────────┘  └────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
              ▲
              │  build & deploy
              │
┌─────────────┴────────────────────────────────────────────────────┐
│   Vercel (Nitro preset)                                          │
│   - TanStack Start SSR via src/server.ts (custom error wrapper) │
│   - @tanstack/react-start functionMiddleware attaches Bearer JWT │
└──────────────────────────────────────────────────────────────────┘
              ▲
              │  commits
              │
┌─────────────┴────────────────────────────────────────────────────┐
│   Lovable dev tooling                                            │
│   - .lovable/project.json, AGENTS.md (project notes)             │
│   - @lovable.dev/cloud-auth-js for OAuth glue                    │
│   - @lovable.dev/vite-tanstack-config (build)                    │
└──────────────────────────────────────────────────────────────────┘
```

The browser is the only client. The server is just a thin SSR shell. The state of truth is Supabase.

---

## 3. Tech stack & versions

### 3.1 Languages & runtimes
- **TypeScript** 5.8.x — `strict`, `moduleResolution: Bundler`, target ES2022, `jsx: react-jsx`, `allowImportingTsExtensions`, `noEmit`. Path alias `@/* → src/*` (`tsconfig.json:23-25`).
- **JavaScript** ESM (root `package.json:5` — `"type": "module"`).
- **CSS** Tailwind v4 with `@tailwindcss/vite` (`@source` in `src/styles.css:1-2`).
- **SQL** Postgres 14 + PostGIS + pgcrypto.

### 3.2 Framework & build
- **React 19.2** (`react`, `react-dom`).
- **TanStack Start 1.167.x** — file-based SSR framework. Entry in `src/start.ts` (registers function/request middleware). SSR is *redirected* to `src/server.ts` via `vite.config.ts:13` (`tanstackStart.server.entry = "server"`).
- **TanStack Router 1.168.x** — file-based routing, auto-generated `src/routeTree.gen.ts`. `defaultPreloadStaleTime: 0` and `scrollRestoration: true` (`src/router.tsx:11-12`).
- **TanStack React Query 5.83.x** — instantiated once in `src/router.tsx:6`, threaded through `router.context.queryClient`.
- **Vite 8.0.x** via `@lovable.dev/vite-tanstack-config 2.5.3` (which itself bundles tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (vercel preset), componentTagger, env injection, dedupe, error logger, sandbox port/host detection).
- **Nitro 3.0.260603-beta** — server runtime; `preset: "vercel"` in `vite.config.ts:16`.

### 3.3 Backend
- **Supabase** (`@supabase/supabase-js` 2.108.x) — Postgres + PostGIS + pgcrypto + Auth + Realtime + RLS.
- **Lovable cloud-auth** (`@lovable.dev/cloud-auth-js` 1.1.x) — wraps OAuth so Lovable's hosted env can hand tokens back to `supabase.auth.setSession`.

### 3.4 UI
- **Tailwind CSS 4.2** + `@tailwindcss/vite 4.2`.
- **shadcn/ui** (config `new-york`, base `slate`, lucide icons) — **49 primitives** in `src/components/ui/` (see §12.2).
- **Radix UI** — 25 wrapper packages.
- **lucide-react 0.575** — icon set used everywhere.
- **framer-motion 12.40** — page/card transitions, slide-to-flick, match reveal.
- **sonner 2.0** — toast notifications (mounted in `src/routes/__root.tsx:163-170`).
- **embla-carousel-react 8.6**, **cmdk 1.1**, **vaul 1.1**, **react-day-picker 9.14**, **react-resizable-panels 4.6**, **input-otp 1.4**, **recharts 2.15**.

### 3.5 Forms & data
- **react-hook-form 7.71** + **@hookform/resolvers 5.2** + **zod 3.24** (currently not used by any route — listed for future form validation).
- **date-fns 4.1**, **tw-animate-css 1.3**.

### 3.6 Tooling
- **ESLint 9.32** flat config + `typescript-eslint 8.56` + `eslint-plugin-react-hooks 5.2` + `eslint-plugin-react-refresh 0.4.20` + `eslint-config-prettier 10.1` + `eslint-plugin-prettier 5.2`. Blocks Next's `server-only` package (TanStack Start doesn't use it). See `eslint.config.js:23-34`.
- **Prettier 3.7** — `printWidth: 100`, double quotes, trailing commas (`all`).
- **Bun** lockfile + `bunfig.toml` enforces `minimumReleaseAge = 86400` (24h supply-chain safety) with explicit bypasses for `@lovable.dev/*` packages.
- **npm** also supported (lockfile present).

### 3.7 Scripts
| Script | Command | What it does |
|--------|---------|--------------|
| `dev` | `vite dev` | Vite dev server (with TanStack Start HMR) |
| `build` | `vite build` | SSR + client bundles, outputs to `.vercel/output` via Nitro |
| `build:dev` | `vite build --mode development` | Same but unminified |
| `preview` | `vite preview` | Serve the built app |
| `lint` | `eslint .` | Lint everything |
| `format` | `prettier --write .` | Auto-format everything |

---

## 4. Runtime topology — what runs where

### 4.1 The browser
- Single-page React app. Service worker registers at first load (`src/routes/__root.tsx:147-158`).
- Auth state lives in Supabase's own `localStorage` (`src/integrations/supabase/client.ts:60-63`).
- Two long-lived realtime channels exist per page: one for `signals` changes, one for `matches` / `messages` / `message_reactions` changes.
- Geolocation via `navigator.geolocation.watchPosition` (high-accuracy, 30 s cache).
- The only network calls are to Supabase REST and Supabase Realtime.

### 4.2 The server (Vercel + Nitro)
- Single entry: `src/server.ts`. Wraps the default TanStack Start entry.
- Two global side effects:
  1. `src/lib/error-capture.ts` installs `error` + `unhandledrejection` listeners that stash the most recent error for 5 s.
  2. `src/server.ts:40-53` returns a custom 500 HTML page (`src/lib/error-page.ts`) if either (a) the handler throws, or (b) h3 silently swallowed the throw into a generic `{unhandled:true, message:"HTTPError"}` JSON. The detection is a substring check on the response body.
- `src/start.ts` wires two middlewares on the TanStack Start side:
  - `requestMiddleware`: `errorMiddleware` — catches non-`statusCode` throws and serves the same 500 page.
  - `functionMiddleware`: `attachSupabaseAuth` (`src/integrations/supabase/auth-attacher.ts`) — for every serverFn RPC, looks up the current Supabase session and attaches `Authorization: Bearer <jwt>`.

### 4.3 Supabase
- Project id `nqtwslncjxbekupkvazu` (`supabase/config.toml:1`).
- Client URL hard-fallback in `src/integrations/supabase/client.ts:40-43` — if the env points to the old project (`wlpiqocwxwxhnchgpqpx`) or is missing, force redirect to the new one.
- Service role client (`client.server.ts`) is for trusted server ops only. As of this snapshot, no route uses it — but it's wired so server-side functions can bypass RLS.

### 4.4 Lovable
- `.lovable/project.json` exists. `AGENTS.md` instructs the agent to never rewrite published git history.
- The Lovable OAuth wrapper is used in `src/routes/auth.tsx:55-78` (Google sign-in) with a graceful fallback to direct `supabase.auth.signInWithOAuth`.

---

## 5. Request lifecycle — from URL to pixel

1. **Browser resolves URL** → `/`.
2. **Service worker** (`public/sw.js`) intercepts.
   - For navigations: network-first, falls back to cached `/` or `caches.match("/")`.
   - For static assets (`/assets/`, `.png|.svg|.ico|.woff2?`): cache-first.
   - For Supabase/Google/Fonts domains: bypass completely (no SW intervention).
3. **Network request reaches Vercel** → Nitro → `src/server.ts`'s `fetch` handler.
4. **server.ts** imports `@tanstack/react-start/server-entry` lazily, calls its `fetch(request, env, ctx)`, and post-processes the response.
5. **TanStack Start** loads the route tree (`src/routeTree.gen.ts`) and matches the path.
6. **`__root.tsx`** (root layout) renders: html shell, head meta, body, sonner toaster, `<QueryClientProvider>`, `<Outlet />`.
7. The matched route component renders. For `_authenticated/*` routes, `beforeLoad` (`src/routes/_authenticated/route.tsx:6-22`) does:
   - `supabase.auth.getUser()` (browser-side anon call)
   - If unauth → `redirect("/auth")`
   - Else if profile has no `vibe` → `redirect("/setup")`
   - Else passes `{ user }` to the page.
8. **Page mounts**. React Query is available via `useQueryClient()`. Realtime channels are subscribed (`supabase.channel(...).on('postgres_changes', ...)`).
9. **Mutations** go directly to Supabase (no serverFn) — the auth attacher only matters if a future page calls a server function.
10. **Realtime events** update component state in place; the URL doesn't change.

---

## 6. Routing map (all 15 files)

Routing is **file-based** under `src/routes/`, generated to `src/routeTree.gen.ts`.

| URL                       | File                                              | Layout / Page | Auth-gated? | Purpose |
|---------------------------|---------------------------------------------------|---------------|-------------|---------|
| `/`                       | `src/routes/index.tsx`                            | Redirector    | n/a         | Reads `flick_onboarding_done` from localStorage, then redirects to `/onboarding` (if missing) or `/auth` / `/home` (depending on session) |
| `/onboarding`             | `src/routes/onboarding.tsx`                       | Page          | No          | 4-step explainer carousel + Location + Notifications permission requests |
| `/auth`                   | `src/routes/auth.tsx`                             | Page          | No          | Sign-in / sign-up (email+password + Google OAuth) |
| `/setup`                  | `src/routes/setup.tsx`                            | Page          | No          | 5-step profile wizard (consent → name → avatar → interests → vibe → done) |
| `/` (shell)               | `src/routes/__root.tsx`                           | Root layout   | n/a         | html/body, QueryClientProvider, Toaster, NotFound, ErrorComponent, service worker registration, auth-state listener |
| `/_authenticated` (shell) | `src/routes/_authenticated/route.tsx`             | Auth layout   | Yes         | `ssr:false`, `beforeLoad` redirects to `/auth` or `/setup`; renders `<Outlet />` |
| `/home`                   | `src/routes/_authenticated/home.tsx`              | Page          | Yes         | Live presence: composer or active-signal card, nearby counter, recent matches |
| `/discover`               | `src/routes/_authenticated/discover.tsx`          | Page          | Yes         | "Radar" — concentric-circle map of nearby signals |
| `/nearby`                 | `src/routes/_authenticated/nearby.tsx`            | Page          | Yes         | List of nearby signals (alternative to radar) |
| `/matches`                | `src/routes/_authenticated/matches.tsx`           | Page          | Yes         | Three-tab: Active (live 2h matches) / Recent (last 7d) / Permanent (connections) |
| `/match/:matchId`         | `src/routes/_authenticated/match.$matchId.tsx`    | Page          | Yes         | Single match chat (timer, reactions, keep-in-touch, mute/block/report via sheet) |
| `/connections`            | `src/routes/_authenticated/connections.tsx`       | Page          | Yes         | Permanent connections list (with private notes sheet) |
| `/profile`                | `src/routes/_authenticated/profile.tsx`           | Page          | Yes         | User profile: avatar, vibe, interests, trust tier, Plus banner, settings link, sign-out |
| `/settings`               | `src/routes/_authenticated/settings.tsx`          | Page          | Yes         | Discoverable toggle, max radius slider, blocked users, legal, sign-out, delete account |
| `/subscription`           | `src/routes/_authenticated/subscription.tsx`      | Page          | Yes         | Flick Plus pricing tiers + simulated UPI checkout |
| `/blocked`                | `src/routes/_authenticated/blocked.tsx`           | Page          | Yes         | List of blocked users with one-tap unblock |

Conventions summary (`src/routes/README.md`):
- `index.tsx` → `/`
- `users/$id.tsx` → `/users/:id`
- `__root.tsx` is the only root layout
- `_authenticated/` is a *pathless* layout (no URL segment)

---

## 7. Bootstrap: from cold load to first paint

### 7.1 File / network order
1. `public/manifest.webmanifest`, `favicon.ico`, `icon-192.png`, `icon-512.png` are pre-cached by `public/sw.js` on `install`.
2. `src/styles.css` is included via `__root.tsx`'s `head().links[]` (`src/routes/__root.tsx:91-102`). Google Fonts (Instrument Serif, Inter, JetBrains Mono) are preconnected and loaded.
3. JS bundle is fetched. `src/router.tsx` creates a `QueryClient` and a router with the generated route tree.
4. `src/start.ts`'s `functionMiddleware` (`attachSupabaseAuth`) is registered for all serverFn calls. `requestMiddleware` (`errorMiddleware`) wraps every request.

### 7.2 Head metadata (from `__root.tsx`)
- `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no` (PWA-correct).
- `theme-color`: `#1a1d24` (midnight).
- `apple-mobile-web-app-status-bar-style`: `black` (opaque, matches bg).
- `apple-mobile-web-app-title`: `Flick`.
- `title`: `Flick — Be here. Find people.`
- `description`: "Broadcast that you're here and open. People nearby who said yes too show up. Zero rejection. Pure serendipity."
- OG / Twitter cards set.

### 7.3 Auth state listener
`__root.tsx:136-145` subscribes to `supabase.auth.onAuthStateChange` and calls `router.invalidate()` on any change, so the page re-runs its `beforeLoad` guards. This is how sign-in / sign-out propagates without a manual reload.

### 7.4 Error handling layers (4-deep)
1. **`__root.tsx.errorComponent`** — React ErrorBoundary. Reports to Lovable (`__lovableEvents.captureException`). Renders "Something flickered." page.
2. **`__root.tsx.notFoundComponent`** — 404.
3. **`src/start.ts` `errorMiddleware`** — catches throws inside serverFn handlers, returns 500 HTML.
4. **`src/server.ts`** — catches all unhandled throws + rewrites h3's swallowed 500 JSON into the same 500 HTML page.
5. **`src/lib/error-capture.ts`** — global `error` + `unhandledrejection` listeners stash the most recent error for 5 s so the SSR wrapper can log it.

### 7.5 Service worker registration
`__root.tsx:147-158` — registers `/sw.js` on `load`. Logs a warning to console on failure (does not break the app).

---

## 8. Authentication subsystem

### 8.1 Email + password
- Implemented in `src/routes/auth.tsx:27-52`.
- Sign-up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { display_name, avatar_emoji } } })`. On success, navigates to `/home` (or `redirect` param if provided and same-origin).
- Sign-in: `supabase.auth.signInWithPassword`.
- Errors surface as `toast.error(...)`.

### 8.2 Google OAuth
- Two-tier with fallback (`src/routes/auth.tsx:54-78`):
  1. Try `lovable.auth.signInWithOAuth("google", { redirect_uri })` (Lovable's hosted wrapper).
  2. If that errors, fall back to direct `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`.
- The Lovable path uses `createLovableAuth()` from `@lovable.dev/cloud-auth-js`. On success, it calls `supabase.auth.setSession(result.tokens)` so the JWT is in the right place for the rest of the app.

### 8.3 Auth middleware
- `src/integrations/supabase/auth-middleware.ts` exposes `requireSupabaseAuth` (a TanStack Start function middleware). Validates a `Bearer` JWT against Supabase, populates `context.userId` and `context.claims`.
- Not currently attached to any route (the `_authenticated/route.tsx` `beforeLoad` does the same check on the client, anon-key call). It's wired for future serverFn-protected endpoints.

### 8.4 Auth attacher (client → serverFn)
- `src/integrations/supabase/auth-attacher.ts` — registered globally via `functionMiddleware: [attachSupabaseAuth]` in `src/start.ts:22`.
- For every serverFn call, looks up `supabase.auth.getSession()` and attaches `Authorization: Bearer <access_token>`.

### 8.5 Sign-out
- Two locations: `src/routes/_authenticated/profile.tsx:209-212` and `src/routes/_authenticated/settings.tsx:78-81`. Both call `supabase.auth.signOut()` then `navigate({ to: "/auth" })`.

### 8.6 Account deletion
- `src/routes/_authenticated/settings.tsx:83-102` — confirms with `window.confirm`, deletes the `profiles` row (cascades to signals/waves/etc. via FK), signs out. **Caveat**: this only deletes the profile; the auth user remains in `auth.users` unless a serverFn or trigger cleans it up. See §20.

### 8.7 Onboarding done flag
- `localStorage["flick_onboarding_done"]` is set by `src/routes/onboarding.tsx:22, 28`. The root index (`/`) checks it and either shows onboarding again or proceeds to auth.

---

## 9. Supabase backend — schema, RPCs, realtime, RLS

### 9.1 Tables (cumulative across 5 migrations)

| Table | Migration | Columns | Notes |
|-------|-----------|---------|-------|
| `profiles` | 1, 3, 4, 5 | `id` (FK auth.users, PK), `display_name`, `avatar_emoji`, `vibe`, `interests text[]`, `discoverable bool`, `max_radius_m int`, `photo_verified bool`, `linkedin_url`, `instagram_url`, `website_url`, `age_verified bool`, `birth_date date`, `dpdp_consent_location bool`, `dpdp_consent_profile bool`, `dpdp_consent_timestamp timestamptz`, `created_at`, `updated_at`, `last_active_at` | One row per user, auto-created by `handle_new_user` trigger on signup |
| `signals` | 1 | `id` (uuid), `user_id` (FK), `intent` (text), `note` (text nullable), `location geography(Point, 4326)`, `radius_m int` (100–5000), `place_label`, `expires_at timestamptz` (default `now() + 60min`), `active bool` (default true), `created_at` | GIST index on `location`. `active, expires_at` index for fast filtering |
| `waves` | 1 | `id`, `signal_id` (FK), `from_user` (FK), `created_at`, `UNIQUE(signal_id, from_user)` | The "yes" gesture on a signal |
| `matches` | 1 | `id`, `user_a`, `user_b` (FKs, `CHECK user_a <> user_b`), `signal_id` (FK), `created_at`, `expires_at` (default `now() + 2h`) | Bidirectional pair, indexed both ways |
| `messages` | 1 | `id`, `match_id` (FK), `sender_id` (FK), `body` (text, length 1–2000), `created_at` | `CHECK` enforces non-empty |
| `connections` | 2, 5 | `id`, `user_a`, `user_b` (UNIQUE pair, CHECK), `created_at`, `notes text` (added in 5) | Permanent; user_a is always the lexically smaller uuid |
| `match_keep_in_touch` | 2 | `match_id`, `user_id` (UNIQUE pair), `created_at` | When both users have a row, the `handle_keep_in_touch` trigger inserts a `connections` row |
| `match_mutes` | 5 | `match_id`, `user_id` (composite PK), `muted_at` | Per-user mute of a chat |
| `message_reactions` | 5 | `message_id`, `user_id`, `emoji` (composite PK), `created_at` | One user can leave the same emoji on a message only once |
| `blocks` | 3 | `blocker_id`, `blocked_id` (composite PK), `created_at`, `CHECK` | Used in `get_nearby_signals` filter |
| `reports` | 4 | `id`, `reporter_id`, `reported_id`, `reason`, `details`, `created_at`, `CHECK` | Used in `get_nearby_signals` filter; only reporter can see their own |
| `verification_requests` | 4 | `id`, `requester_id`, `recipient_id`, `platform` (text: 'linkedin'/'instagram'/'photo'/'website'), `created_at`, `UNIQUE(requester_id, recipient_id, platform)` | Currently no UI surface; defined for future "ask for more" feature |

### 9.2 Triggers

| Trigger | On | Function | Effect |
|---------|----|----------|--------|
| `on_auth_user_created` | `auth.users` AFTER INSERT | `handle_new_user()` | Inserts a `profiles` row using `raw_user_meta_data` (display_name, avatar_emoji) or email-derived defaults |
| `on_keep_in_touch_created` | `match_keep_in_touch` AFTER INSERT | `handle_keep_in_touch()` | When both users have opted in, inserts a permanent `connections` row (LEAST/GREATEST for canonical pair) |
| `on_message_sent_touch_active` | `messages` AFTER INSERT | `touch_last_active()` | Sets `profiles.last_active_at = now()` for the sender — used by chat to render "Active now" / "Active 5m ago" |

### 9.3 RPCs (all `SECURITY DEFINER`, all `GRANT EXECUTE TO authenticated`)

| RPC | Signature | Used by | Behaviour |
|-----|-----------|---------|-----------|
| `get_nearby_signals` | `(in_lat double, in_lng double, in_search_radius_m int=2000) → table` | `discover.tsx`, `nearby.tsx` | Returns up to 50 active, unexpired, discoverable, non-blocked, non-reported signals within the LEAST(in_search_radius, s.radius_m, 5000) radius. **Distance is bucketed** (`<250m → 100`, `<500m → 350`, `<1km → 750`, else `round(d/500)*500`) to prevent trilateration. Returns `is_mine` and `already_waved` per row. |
| `count_nearby_signals` | `(in_lat double, in_lng double, in_search_radius_m int=2000) → int` | `home.tsx` | Cheap count of "others" active nearby, for the home badge. Same discoverable/blocks/reports filters. |
| `wave_on_signal` | `(in_signal_id uuid) → uuid` (match_id) | `discover.tsx`, `nearby.tsx` | Validates the signal is still live, refuses self-waves, inserts a `waves` row (idempotent), returns existing or newly-created `matches` row id. |
| `block_user` | `(in_blocked_id uuid) → void` | `discover.tsx`, `chat-profile-sheet.tsx` | Idempotent insert into `blocks`. |
| `unblock_user` | `(in_blocked_id uuid) → void` | `blocked.tsx` | Deletes the row. |
| `get_blocked_users` | `() → table(blocked_id, display_name, avatar_emoji, blocked_at)` | `blocked.tsx` | Convenience view joining `blocks` + `profiles`. |
| `set_connection_notes` | `(in_connection_id uuid, in_notes text) → void` | `connections.tsx` | Validates the user is part of the connection, then updates `notes`. |

### 9.4 RLS summary
All tables have RLS enabled. Important policies:
- `profiles SELECT` — self + anyone you have a match with (cross-profile read).
- `signals` — author-only CRUD; everyone else goes through the SECURITY DEFINER RPC.
- `matches SELECT` — only `user_a` or `user_b`.
- `messages SELECT/INSERT` — only matched users **and** either `matches.expires_at > now()` OR a `connections` row exists (this is the relaxation added in migration 2 so chats remain readable after keep-in-touch upgrades to permanent).
- `blocks` — self-management.
- `match_mutes` — self-management.
- `message_reactions` — read for matched users; insert/delete self.
- `reports` — read self; insert self.
- `match_keep_in_touch` — insert self; read for matched users.

### 9.5 Realtime publication
The following tables are in the `supabase_realtime` publication:
- `signals` (migration 1)
- `matches` (migration 1)
- `messages` (migration 1)
- `message_reactions` (migration 5)

The frontend subscribes to all four in the relevant pages (see §13).

### 9.6 Types
`src/integrations/supabase/types.ts` is auto-generated (1458 lines) by Supabase CLI. `PostgrestVersion: "14.5"`. The file declares all tables, their Row/Insert/Update shapes, and relationships.

---

## 10. End-to-end user journey

This section traces everything a new user can do, with the file:line that makes it happen.

### 10.1 First open
1. `index.tsx:7-13` checks `localStorage.flick_onboarding_done`. Missing → `redirect("/onboarding")`.
2. `onboarding.tsx` plays 4 carousel steps: pitch → how-it-works (3 numbered cards) → mutual-trust bullets → location + notifications permission request. Final CTA sets the localStorage flag and goes to `/auth`.
3. `auth.tsx` shows the sign-up form by default. User types email/password/name → `supabase.auth.signUp`. The DB trigger `handle_new_user` creates a `profiles` row.
4. After successful sign-up, `navigate("/home")` triggers the `_authenticated/route.tsx beforeLoad`, which queries `profiles.vibe` and finds `null` → `redirect("/setup")`.
5. `setup.tsx` runs a 5-step wizard. The final step calls `supabase.from("profiles").upsert({ ..., vibe, interests, age_verified, ... })`, then `setStep(6)`. The "Open Flick" button navigates to `/home`.
6. Home renders.

### 10.2 Going live
1. On `/home`, user picks an intent (chip row), types a note (≤140 chars), adjusts radius (200–3000 m, default 800) and duration (15–180 min, default 60).
2. They drag the `SlideButton` (`home.tsx:738-888`) past 95% → `onSwipe` calls `goLive()`.
3. `goLive()` calls `getPosition()` (a `navigator.geolocation.getCurrentPosition` wrapper that distinguishes "permission denied" from "couldn't read"), then `supabase.from("signals").insert({ user_id, intent, note, radius_m, location: \`POINT(${lng} ${lat})\`, expires_at })`. The `POINT(...)` is a WKT literal that PostGIS parses into `geography(Point, 4326)`.
4. On success, `setActive(data)`. The `nearbyCount` is refetched. A toast confirms.
5. The composer's `AnimatePresence` swaps the composer for `ActiveSignalCard` which shows a ticking countdown (`mins:secs` updating every 1 s, urgent if <10m, warning if <30m), the live pulse, and an "End signal" button.

### 10.3 Being discovered
- Every other user within 2 km whose `discoverable` is `true` and who is not blocked will see the user in:
  - `discover.tsx` radar — a deterministic angle (hashed UUID) and a radius proportional to `distance_m / 2000`, mapped to a 42% radius circle.
  - `nearby.tsx` list — sorted by distance.
  - `home.tsx` counter — only the count, not the list.

### 10.4 The Wave → Match flow
1. Other user opens `discover` or `nearby`, taps a hotspot, and clicks **Wave** (or **Wave Back** if you've already waved and they wave back — but `wave_on_signal` is idempotent, so it's actually instant).
2. The frontend calls `supabase.rpc("wave_on_signal", { in_signal_id })`.
3. The RPC validates: caller is authenticated, signal is live, not own. Inserts a `waves` row (idempotent). Inserts (or returns) a `matches` row with `(LEAST, GREATEST, signal_id)`. The match's `expires_at` defaults to `now() + 2h`.
4. The frontend receives the `matchId`, optimistically marks the signal as `already_waved`, and navigates to `/match/:matchId`.
5. A realtime `INSERT` on `matches` fires the **other** device's `home.tsx` handler (`home.tsx:200-227`), which fetches the other party's profile and intent, sets `reveal = { matchId, otherName, otherAvatar, sharedIntent }`, and renders the full-screen `MatchReveal` overlay (particles, two avatars, heart icon, "It's mutual — 90 minutes. Say something real.") — but on the home page, not the match page. (The copy says 90 min but `matches.expires_at` is 2 h; this is a known copy/DB mismatch — see §20.)
6. Tapping anywhere navigates to `/match/:matchId`.

### 10.5 The 2-hour chat
1. `match.$matchId.tsx` runs a 4-way parallel fetch: match row, other-user profile, signal (for intent+place_label), all messages, and existing keep-in-touch rows.
2. `supabase.channel(\`match-${matchId}\`)` subscribes to `INSERT ON messages` filtered by `match_id`. New messages appear in the bubble list instantly.
3. `supabase.channel(\`reactions-${matchId}\`)` subscribes to `*` on `message_reactions` and re-fetches all reactions on every change.
4. The composer is a `textarea` with auto-grow. `Enter` (without Shift) sends. Send inserts into `messages` (which the trigger updates `last_active_at` on).
5. The header shows the other user's "Active now" / "Last seen Xm ago" by diffing `profiles.last_active_at` with `now`.
6. The `Bubble` component supports **long-press to react** (420 ms timer) → opens an emoji picker (❤️🔥😂😮😢👍). Tapping an emoji inserts/deletes a `message_reactions` row.
7. After 60 minutes remaining, a "Less than 30 minutes left" warm banner slides in. After 10 minutes, a destructive "Closing in Xm" banner.
8. Once `mins < 60` AND the user hasn't already kept in touch, a **Keep in touch** button appears. Clicking inserts into `match_keep_in_touch`; the trigger checks if the other side has also opted in and, if so, creates a permanent `connections` row.
9. When `expires_at` is reached, the composer is disabled, the chat shows "This conversation has ended" with a "Keep in touch" CTA if the window was reached before either side opted in. After 7 days the messages are deleted (RLS relaxes reads for `connections` past expiry; hard deletion is presumably a scheduled job, see §20).

### 10.6 The permanent transition
1. When both sides tap Keep in touch, the trigger inserts into `connections`. Both devices see this because:
   - `matches.tsx` subscribes to `INSERT ON connections` and reloads.
   - `connections.tsx` fetches all connections on mount.
2. The user appears in:
   - `matches.tsx` "Permanent" tab with a green "Permanent" badge.
   - `connections.tsx` standalone list.
3. The user can attach a private note (up to 600 chars) to the connection via the sticky-note icon → bottom sheet → `set_connection_notes` RPC.
4. From a connection row, "Message" jumps back into the original match chat (now permanent — the relaxed message RLS allows reads past `expires_at` when a connection exists).

### 10.7 Safety paths
- **Block from match chat**: `chat-profile-sheet.tsx` → `block()` → `block_user` RPC + `reports` insert + `matches` delete. On blocked, the chat closes.
- **Block from discover**: `discover.tsx:447-478` shows a red "Block & Report" button next to Wave. Calls `block_user` + `reports` insert.
- **Mute from match chat**: `toggleMute` → insert/delete on `match_mutes`. No effect on message content, only the toast says "You won't be notified." (Push notifications aren't actually wired to this table.)
- **Unblock**: `settings.tsx → /blocked → unblock() → unblock_user` RPC.

### 10.8 Subscription path
1. `profile.tsx` shows a "Flick Plus" banner → `navigate("/subscription")`.
2. `subscription.tsx` shows three tiers (Annual ₹999, Monthly ₹149, 3-Credit Pack ₹49). User picks one.
3. The bottom "Pay" button opens a slide-up drawer with simulated UPI options (GPay / PhonePe / Paytm / BHIM UPI).
4. Clicking **Pay via UPI** transitions to a 2.2-second "Verifying payment…" state, then to a success screen.
5. On success: `localStorage.setItem("flick_plus_active", "true")`. The `profile.tsx` banner now reads "Your subscription is active" with a "Manage your Plus features" CTA. `subscription.tsx` itself shows the active state with "Cancel Subscription".
6. **This is a stub**: the "subscription" is purely a localStorage flag. The `flick_plus_active` flag is read on every profile/settings load, but no server-side entitlement is enforced anywhere. Real features (unlimited signals, 3-hour match windows, etc.) listed in the pricing page are not yet wired through the database.

---

## 11. Page-by-page deep dive

### 11.1 `/` — `src/routes/index.tsx` (16 lines)
- `ssr: false`, `beforeLoad` only.
- Reads `localStorage.flick_onboarding_done`. If missing → `/onboarding`. Else checks `supabase.auth.getSession()` and routes to `/home` or `/auth`.
- The component itself is `() => null` — it never renders anything; the redirect happens before the render.

### 11.2 `/onboarding` — `src/routes/onboarding.tsx` (250 lines)
- `ssr: false`, 4 carousel steps, 2 of which are CTAs (location permission, notification permission).
- Step 0: "The people you were meant to meet are already near you" + pitch.
- Step 1: 3 numbered "How it works" cards (Say you're here / Stay invisible / 90-minute window).
- Step 2: "Invisible until it's mutual" with 3 bullets.
- Step 3: Two permission buttons. Allow Location calls `navigator.geolocation.getCurrentPosition`; success or denied both advance. Enable Notifications calls `Notification.requestPermission()`. Both can be skipped via the top-right Skip link.
- Final state: sets the localStorage flag and routes to `/auth`.

### 11.3 `/auth` — `src/routes/auth.tsx` (234 lines)
- `ssr: false`, two-mode form (signup / signin) toggled by a single button at the bottom.
- Form fields: name (signup only), email, password. Submit calls `signUp` or `signInWithPassword`.
- Below: a "Continue with Google" button. Tries Lovable's wrapper first; on error, falls back to direct `supabase.auth.signInWithOAuth`.
- Supports a `?redirect=/path` search param, validated to start with `/` and defaulting to `/home`.
- On auth change, `__root.tsx`'s listener invalidates the router and the page navigation happens.

### 11.4 `/setup` — `src/routes/setup.tsx` (432 lines)
- `ssr: false`, 5-step wizard, gated by an authenticated user.
- Step 1: Two checkboxes (`ageConfirmed`, `guidelinesAccepted`) — 18+ affirmation and community guidelines. Both required to continue.
- Step 2: First name input (≥2 chars).
- Step 3: Avatar picker (`AvatarPicker` component) — DiceBear style grid (12 styles) + Shuffle + manual seed. Stores the full URL.
- Step 4: ≥3 interests from a 31-tag list (GATE, CAT, Coding, …, Environment).
- Step 5: Vibe (≤160 chars).
- On save: `supabase.from("profiles").upsert({ id: userId, display_name, avatar_emoji, vibe, interests, age_verified, updated_at })`. On success, step 6 shows a "You're in." screen with a CTA to `/home`.

### 11.5 `/home` — `src/routes/_authenticated/home.tsx` (888 lines)
The core of the app. Two states: composer (when no active signal) and active-signal card (when one is live).
- **Initial load**: 6-way parallel fetch: active signal, total signals count, total matches count, total connections count, last 3 matches (with profile+intent enrichment), getCurrentPosition.
- **Position watch**: `navigator.geolocation.watchPosition` (30s cache). Updates `nearbyCount` via `count_nearby_signals` RPC and reverse-geocodes the label (`reverseGeocode` → Nominatim).
- **Realtime**: two channels — `home-matches-feed` (INSERT on matches for either user) and `home-signals-count` (any change on signals).
- **Composer**: horizontal intent chips, note textarea (140 char limit), radius slider (200–3000 m), duration slider (15–180 min), the **SlideButton** swipe-to-go-live widget.
- **ActiveSignalCard**: ticking countdown, the live pulse dot, intent label, optional note, "End signal" button, "N people nearby · open matches" if applicable.
- **Recent matches**: top 3 most recent matches with avatar + name + shared intent.
- **Stats footer**: "N signals · N matches · N connections" (italic mono caption).
- **MatchReveal overlay**: full-screen animated reveal (particles, two avatars, heart icon) when a new match comes in via realtime. Tap → opens the match chat.
- **Latent bug handling**: `last_active_at` update ignores the `42703` (column doesn't exist) error code, because the column was added in migration 5 and may be missing in older deployments.

### 11.6 `/discover` — `src/routes/_authenticated/discover.tsx` (511 lines)
- **Radar visualisation**: a 340×340 circle with concentric dashed rings, a static radial glow, a rotating sweep line, and a pulsing center dot. Hotspot markers are placed at `(50% + sin(angle) * radiusRatio * 42%, 50% + cos(angle) * radiusRatio * 42%)` where `angle` is a deterministic hash of the signal's UUID and `radiusRatio = clamp(distance_m / 2000)`.
- **Trust scoring**: per-signal — base 25, +15 if `age_verified`, +25 if `photo_verified`, +15 if `linkedin_url`, +15 if `instagram_url`, +5 if `website_url`. Tiers: `<40` Unverified, `<60` Verified, `<80` Trusted, else Established.
- **Selection**: tapping a hotspot shows a bottom drawer with the person's avatar, name, trust badge, intent + distance, optional note, identity panel, and three actions: Wave Back, Block & Report, Close.
- **Wave flow**: `wave_on_signal` RPC. On success, optimistic UI update and navigate to match.
- **Permission error path**: if geolocation is denied, shows a "Location Off" empty state with no retry button (the user has to enable it in system settings).

### 11.7 `/nearby` — `src/routes/_authenticated/nearby.tsx` (345 lines)
- **List view** alternative to the radar. Each card: avatar with `live-glow` ring + LivePulse indicator, name with `CheckCircle2` if `photo_verified`, one-line bio or fallback, intent chip, distance bucket (`<250m / 250-500m / 500m-1km / 1-2km`), and an optional note.
- **Wave button** at the bottom of each card. **Tap the avatar area** opens the `ChatProfileSheet` (same component used in match chat) — a bottom sheet with verification badges, bio, interests, Mute/Report/Block actions.
- Same RPC and realtime wiring as discover.

### 11.8 `/matches` — `src/routes/_authenticated/matches.tsx` (481 lines)
- **Three tabs**: Active (live 2h matches), Recent (last 7d, expired), Permanent (connections).
- **Active/Recent**: cards with avatar, name, intent icon, last message preview, "Xm left" or "Ended" tag, urgent/warning border colour. Tapping goes to `/match/:matchId`.
- **Permanent tab**: uses `PermanentList` which shows connections with a green "Permanent" badge, last message preview with "You:" prefix, and a time-ago tag. If the connection has an associated match, tapping goes to that match chat (now read-only if expired but still navigable).
- **Real-time**: 3 channels: matches changes, new messages, connections changes. Any of them triggers a full `load()`.
- **Banner**: at the bottom of the active tab, if any connections exist, shows a "N permanent connections" link to `/connections`.

### 11.9 `/match/:matchId` — `src/routes/_authenticated/match.$matchId.tsx` (720 lines)
- **Header**: back button, tappable avatar+name (opens profile sheet), "more" menu (View profile / Mute+Block).
- **Match banner** (warm amber): "It's mutual. Xm Ys left to make it count."
- **Warning/urgent banners** (warm/destructive): slide-in at 30 min and 10 min remaining.
- **Messages**: grouped by day with relative labels (Today / Yesterday / short date). The first group in a fresh chat shows "You matched on [intent] — say hi 👋". The Bubble component supports long-press to react (420 ms).
- **Sticky "X new messages" pill** when not at bottom and there are unread inserts.
- **Keep-in-touch banner** appears when `mins < 60` and not already opted in. Tap → insert `match_keep_in_touch` row, toast, check for mutual, toast again if mutual.
- **Expired state**: "This conversation has ended." Composer disabled. If the keep-in-touch banner condition still holds, show the CTA.
- **Realtime**: 2 channels — one for `INSERT ON messages` (filtered by `match_id`), one for `*` on `message_reactions`.
- **last_active_at**: heartbeats every page mount and after sending a message.

### 11.10 `/connections` — `src/routes/_authenticated/connections.tsx` (396 lines)
- Lists all connections. Each row: avatar (with `live-glow`), name, "Permanent" badge, last message (with "You:" prefix) OR "Met over [intent]" OR vibe fallback, time-ago.
- Two action buttons: a sticky-note icon (opens the notes bottom sheet) and a "Message" button (navigates to the original match chat if available).
- **Notes bottom sheet**: 600-char private note editor, calls `set_connection_notes` RPC.

### 11.11 `/profile` — `src/routes/_authenticated/profile.tsx` (596 lines)
- **Header**: Flick logo + "Profile" chip, "Plus Member" badge if `localStorage.flick_plus_active === "true"`. A settings cog in the top-right.
- **Avatar block**: 80×80 preview + "Change avatar" button → bottom sheet with the same `AvatarPicker` as setup.
- **Stats grid**: Signals / Matches / Connections.
- **Flick Trust banner**: behaviour-based tier (New / Trusted / Established). Tapping opens a sheet explaining the rules:
  - New: < 7 days OR 0 connections.
  - Trusted: 7+ days AND ≥ 1 connection.
  - Established: 30+ days AND ≥ 5 connections.
- **Plus banner**: Manage / Unlock Unlimited Signals.
- **Form fields**: First name, vibe (one line), email (disabled). All editable.
- **Interests**: read-only chips by default; "Edit" toggles an in-place picker.
- **Save Profile** + **Sign out** buttons.
- **`last_active_at` doesn't exist check**: the profile doesn't write `last_active_at` on this page (only home and match chat do), so the older SQL deployments don't error here.

### 11.12 `/settings` — `src/routes/_authenticated/settings.tsx` (249 lines)
- **Privacy & Visibility card**: Discoverable toggle, Max Discovery Radius slider (500–3000 m). Saves to `profiles.discoverable` and `profiles.max_radius_m`.
- **Safety**: link to `/blocked`.
- **Legal**: Community Guidelines + Privacy Policy & Terms. Both currently `toast.info(...)` with the body text inline (no separate pages).
- **Sign out** and **Delete Account** (the latter does `profiles.delete().eq(id)` + sign-out).

### 11.13 `/subscription` — `src/routes/_authenticated/subscription.tsx` (503 lines)
- Two states based on `localStorage.flick_plus_active`:
  - **Inactive**: 3 pricing cards, features grid (Unlimited Signals, Radius Precision Control, Extended Match Windows, Unlimited Messaging), sticky bottom bar with primary CTA, simulated UPI checkout drawer.
  - **Active**: subscription summary card, "Plus Benefits Active" list, "Cancel Subscription" destructive button.
- The checkout drawer has 3 sub-states: `method` (UPI selector) → `processing` (2.2 s) → `success` (bouncy checkmark). On success, sets the localStorage flag and navigates back to `/profile`.
- **The pricing copy says 3-hour match windows and unlimited messaging** but neither is implemented at the database or React level — purely a sales surface for now.

### 11.14 `/blocked` — `src/routes/_authenticated/blocked.tsx` (144 lines)
- Lists blocked users via `get_blocked_users` RPC. Each row: avatar (60% opacity), name, blocked date, "Unblock" button → `unblock_user` RPC.

---

## 12. Product components

### 12.1 `src/components/flick/` (7 files)

| File | Role | Key props / state |
|------|------|-------------------|
| `app-shell.tsx` (60 lines) | Page wrapper for all authenticated pages. Provides the `container-page` (max-w-28rem mobile / 48rem tablet / 56rem desktop), padding-bottom for the bottom nav, the `<BottomNav>` itself, and the `<PwaInstallPrompt>`. | `children: ReactNode` |
| `avatar.tsx` (219 lines) | `<FlickAvatar>` — renders either a DiceBear image (if `emoji` is a URL) or a 6-variant gradient SVG (gradient-1..6) with the user's first initial. Handles `img.onError` fallback. | `emoji`, `name`, `className` |
| `avatar-picker.tsx` (136 lines) | `<AvatarPicker>` — DiceBear style grid (12 styles), live preview, Shuffle button, manual seed input, Reload button. Calls `onChange(url, seed, style)` on every change. | `initialUrl?`, `initialSeed?`, `initialStyle?`, `name?`, `onChange` |
| `chat-profile-sheet.tsx` (390 lines) | `<ChatProfileSheet>` — bottom sheet for viewing a person's profile in a match context. Loads/sets the `match_mutes` row, exposes Mute / Report / Block actions, includes a Report dialog and Block confirmation modal. | `open`, `onOpenChange`, `user: ChatProfileUser`, `intent`, `matchId`, `currentUserId`, `onBlocked` |
| `live-pulse.tsx` (19 lines) | `<LivePulse>` — the small pulsing dot used on the active signal card and on nearby avatars. Two stacked spans, an outer "pulse-ring" (scale 0.85→2.2 over 2.4 s, fade out) and an inner "pulse-dot" (scale 1↔1.1 over 2.4 s). | `className?`, `size?` (default 10) |
| `match-reveal.tsx` (164 lines) | `<MatchReveal>` — full-screen reveal overlay for new matches. Generates 28 randomly-coloured particles on each `visible=true`, animates them outward, shows the two avatars with a heart in the middle, the shared intent, and a "Say hi" CTA. Tap anywhere to dismiss. | `visible`, `otherName`, `otherAvatar`, `sharedIntent`, `onDismiss` |
| `pwa-install-prompt.tsx` (263 lines) | `<PwaInstallPrompt>` — bottom banner that appears 30 s after first session, with the BIP API. If `beforeinstallprompt` isn't supported (iOS), shows a 3-step Share → Add to Home Screen dialog. Dismiss writes a 7-day cooldown to `localStorage.flick_pwa_prompt_dismissed_at`. | (none — uses internal state) |

### 12.2 `src/components/ui/` (49 shadcn primitives)

Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip.

The actually used primitives across the app: **Sheet, Dialog, Switch, Slider, Button, Toaster (via sonner), Tabs (matches page), Form** (declared but not used by any route yet), and the rest are present for future expansion.

---

## 13. Hooks, libraries, integrations

### 13.1 Hooks (`src/hooks/`)
- `use-auth.ts` (24 lines) — `useAuth()` returns `{ session, user, loading }` by subscribing to `onAuthStateChange` and `getSession()`. Currently not consumed by any route — every route uses `supabase.auth.getUser()` directly.
- `use-debounced.ts` (29 lines) — `useDebouncedValue<T>(value, delay=250)` and `useElementSize<T>` (ResizeObserver wrapper). Currently not used by any route.
- `use-mobile.tsx` (19 lines) — `useIsMobile()` (breakpoint 768 px). Currently not used by any route (the responsive system is class-based via Tailwind breakpoints + the `container-page` utility).
- `use-scroll-direction.ts` (70 lines) — `useScrollDirection()` returns `"up" | "down" | null` with a 8 px threshold. Used by `app-shell.tsx` to hide the bottom nav on scroll-down. Also exports `useScrollY()`.

### 13.2 Libraries (`src/lib/`)
- `utils.ts` (20 lines) — `cn()` class composer + `PREMIUM_GRADIENTS` map (6 Tailwind gradient classes).
- `intents.ts` (74 lines) — The 8 official intents (`coffee`, `walk`, `work`, `food`, `drink`, `talk`, `read`, `music`) with Lucide icon, label, and a placeholder prompt. `intentByKey(key)` is the lookup used everywhere.
- `geocode.ts` (33 lines) — `reverseGeocode(lat, lng)` using OpenStreetMap Nominatim (free, no API key). Returns "Neighbourhood, City" or fallback to "your location". Used on home for the location pill.
- `avatars.ts` (33 lines) — DiceBear URL builder (`dicebearUrl(seed, style)`) + style catalogue (12 styles, default `lorelei`) + `isDicebearUrl()` helper + `randomSeed()`.
- `error-capture.ts` (27 lines) — Global error stash. Listens to `error` + `unhandledrejection` and stores the last error with a 5-second TTL. Consumed by `server.ts` to log the real cause of a h3-swallowed 500.
- `error-page.ts` (30 lines) — Pure function that returns a static HTML string for the 500 page. No dependencies.
- `lovable-error-reporting.ts` (36 lines) — `reportLovableError(error, context)` — calls `window.__lovableEvents?.captureException?.(...)` if Lovable's event bus is installed. Used by the root error boundary.

### 13.3 Integrations (`src/integrations/`)

#### `supabase/`
- `client.ts` (76 lines) — Browser client. Reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` process env as fallback). Forces a fallback to the new project id if the env points to the old one. Proxy-lazy-instantiated so the first call creates the client.
- `client.server.ts` (72 lines) — Server admin client. Uses `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. Not currently imported by any route file.
- `auth-middleware.ts` (105 lines) — `requireSupabaseAuth` function middleware. Verifies the Bearer token, populates `context.userId` + `context.claims`. Not yet attached to any route.
- `auth-attacher.ts` (15 lines) — Client-side `functionMiddleware` that attaches the current session's access token as `Authorization: Bearer <jwt>` to all serverFn calls. Registered globally in `src/start.ts:22`.
- `types.ts` (1458 lines, auto-generated) — `Database` type for the typed client.

#### `lovable/`
- `index.ts` (41 lines) — `lovable.auth.signInWithOAuth(provider, opts)` — wraps Lovable's hosted OAuth so the result is fed to `supabase.auth.setSession`.

### 13.4 Realtime channels — full inventory

| Page | Channel name | Filter | Triggers |
|------|--------------|--------|----------|
| `home` | `home-matches-feed` | `INSERT ON matches WHERE user_a=eq.${uid}` and `user_b=eq.${uid}` | Sets `reveal`, fetches other party + intent |
| `home` | `home-signals-count` | `* ON signals` (public) | Re-fetches `count_nearby_signals` |
| `discover` | `discover-signals-feed` | `* ON signals` (public) | Re-fetches `get_nearby_signals` |
| `nearby` | `signals-feed` | `* ON signals` (public) | Re-fetches `get_nearby_signals` |
| `match/:matchId` | `match-${matchId}` | `INSERT ON messages WHERE match_id=eq.${matchId}` | Appends message, increments unread if scrolled up |
| `match/:matchId` | `reactions-${matchId}` | `* ON message_reactions` (public) | Re-fetches all reactions for the match's messages |
| `matches` | `matches-feed` | `* ON matches`, `INSERT ON messages`, `* ON connections` | Full `load()` reload |

---

## 14. Design system, styling, motion

### 14.1 Palette (`src/styles.css:53-92`)
- Midnight base: `oklch(0.16 0.012 250)` (warm-leaning dark slate).
- Three surface elevations: `--surface`, `--surface-2`, `--surface-3`.
- **Primary — electric lime**: `oklch(0.92 0.2 122)`. Used for live indicators, primary buttons, the live-pulse dot, the active-signal card border.
- **Warm — amber**: `oklch(0.83 0.13 65)`. Used for match reveals, "kept in touch" buttons, "Permanent" badges.
- **Destructive — red-orange**: `oklch(0.65 0.21 22)`. Used for "End signal" countdown, urgent banners, delete actions.
- **Border**: `oklch(1 0 0 / 8%)` — subtle white.
- **Ring**: lime at 60% opacity.

### 14.2 Typography
- `--font-display`: Instrument Serif (italic display headings).
- `--font-sans`: Inter (UI body).
- `--font-mono`: JetBrains Mono (small caps labels, timestamps, system chrome).
- Loaded from Google Fonts in `__root.tsx:99-101`.

### 14.3 Custom utilities (`src/styles.css`)
- `.glass` — surface at 70% with backdrop blur 20 px.
- `.live-glow` — primary-tinted 3-stop box-shadow.
- `.warm-glow` — warm-tinted 2-stop box-shadow.
- `.no-tap` — `-webkit-tap-highlight-color: transparent` (suppresses the iOS blue tap flash).
- `.safe-top / -bottom / -left / -right / -x / -y` — env(safe-area-inset-*) helpers.
- `.container-page` — responsive max-widths (28rem / 48rem / 56rem).
- `premium-shine` — animated metallic shine gradient (used on the slide-to-flick button).
- `radar-loader`, `radar-sweep` — the discover page radar.
- `animate-pulse-ring`, `animate-pulse-dot`, `animate-float-up`, `shimmer-arrows` — keyframe animations.

### 14.4 Motion language
- Almost universally `framer-motion` with the curve `[0.22, 1, 0.36, 1]` (a "easeOutQuart"-ish curve) for entry animations.
- `AnimatePresence mode="wait"` for swapping composer↔active-signal on home.
- Match reveal uses spring-style staggered animations (avatars in from x:±20, heart scale 0→1.3→1, particles 0→1.4→0.8→0).
- 3 button feedback conventions:
  - `active:scale-[0.98]` on rectangular buttons
  - `active:scale-95` on chips
  - `active:scale-90` on icon-only buttons

---

## 15. PWA / offline / push

### 15.1 Manifest (`public/manifest.webmanifest`)
- `name` / `short_name`: "Flick — Be here. Find people." / "Flick".
- `display`: `standalone`, `orientation`: `portrait`.
- `theme_color` / `background_color`: `#1a1d24`.
- 2 icons: 192×192 + 512×512 (both `any maskable`).

### 15.2 Service worker (`public/sw.js`)
- Versioned cache key `flick-v1`.
- `install` — pre-caches `/`, `/manifest.webmanifest`, `/favicon.ico`, `/icon-192.png`, `/icon-512.png`. Calls `skipWaiting()`.
- `activate` — purges old caches, calls `clients.claim()`.
- `fetch` rules:
  - **Bypass completely** (no SW intervention): `*.supabase.co`, `accounts.google.com`, `fonts.googleapis.com`, `fonts.gstatic.com` — always fresh.
  - **Cache-first** for same-origin static assets (`/assets/*`, image/font extensions).
  - **Network-first with cache fallback** for navigations.

### 15.3 Install prompt (`pwa-install-prompt.tsx`)
- Appears 30 s after first session if the BIP fires.
- iOS path: shows a 3-step dialog (Share → Add to Home Screen → Add).
- Dismissed state: `localStorage.flick_pwa_prompt_dismissed_at` with 7-day cooldown.

### 15.4 OneSignal push (`OneSignalSDKWorker.js`)
- Single line: `importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")`.
- **No code in the React app** references OneSignal directly. The worker is registered by the browser when the page calls `OneSignal.init` — but `init` isn't called anywhere. The worker is effectively dormant.
- The `notification.requestPermission()` call on the onboarding screen requests the browser's native notification permission, not OneSignal's.

### 15.5 Icons / assets (`public/`)
- `Flick.png`, `faviconLogoFlick.png` — brand.
- `tlogo.svg` — inline-displayed in headers and on the slide-to-flick handle.
- `activedot.svg` — inline-displayed in the discover "N active" chip.
- `hotspot-dot.png` — present but not referenced in any source file.
- `icon-192.png`, `icon-512.png` — manifest icons.
- `generate_icons.js` — utility to regenerate icons (not run automatically).
- `robots.txt` — standard.

---

## 16. Safety, trust, monetisation

### 16.1 Flick Trust (`profile.tsx:163-187` + `discover.tsx:91-112`)
- **Profile page tier** (behaviour-based):
  - New: < 7 days OR 0 connections
  - Trusted: 7+ days AND ≥ 1 connection
  - Established: 30+ days AND ≥ 5 connections
- **Discover page score** (raw points, mapped to same labels):
  - 25 base + 15 `age_verified` + 25 `photo_verified` + 15 `linkedin_url` + 15 `instagram_url` + 5 `website_url`
  - Tiers: <40 Unverified, <60 Verified, <80 Trusted, else Established
- No ID, no selfie, no OTP. The `setup.tsx` 18+ confirmation checkbox is the only identity check.
- DPDP (Indian privacy law) consent columns exist on profiles (`dpdp_consent_location`, `dpdp_consent_profile`, `dpdp_consent_timestamp`) but **no UI writes to them yet**.

### 16.2 Block / Report
- Block from discover (`discover.tsx:447-478`) — `block_user` RPC + `reports` insert with reason "Inappropriate profile / safety concern".
- Block from chat (`chat-profile-sheet.tsx:135-158`) — `block_user` + `reports` insert with reason "User blocked from chat profile" + `matches` row delete. (Side effect: the other party is also kicked from the match.)
- Report from chat (`chat-profile-sheet.tsx:114-133`) — inserts into `reports` with one of 5 reasons (Spam, Harassment, Inappropriate content, Impersonation, Other) + optional 600-char details.
- Unblock (`blocked.tsx`) — `unblock_user` RPC.

### 16.3 Mute
- Per-match: `match_mutes` row. Only affects notification copy ("You won't be notified.") — no actual notification suppression is wired.

### 16.4 Distance bucketing (`migration 4`)
- `<250m` → displayed as `100m`
- `<500m` → `350m`
- `<1km` → `750m`
- else → `round(d/500)*500`
- This is anti-trilateration: even with multiple signal positions, a single attacker can't narrow down a user to a precise building.

### 16.5 Monetisation (`subscription.tsx`)
- Three tiers: Annual ₹999, Monthly ₹149, 3-Credit Pack ₹49.
- "Plus" features advertised (unlimited signals, radius precision, 3h match windows, unlimited messaging) are **not yet implemented** in the database or the React code.
- The localStorage flag is the only state — there's no server-side entitlement check, no Stripe/Razorpay integration, no webhook.

---

## 17. Build, deploy, observability

### 17.1 Build pipeline
- `@lovable.dev/vite-tanstack-config` wraps Vite. Key features it injects: `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, `nitro (vercel preset)`, `componentTagger` (dev-only), `VITE_*` env injection, `@` path alias, React/TanStack dedupe, error logger plugins, sandbox port/host detection.
- `vite.config.ts` adds two overrides:
  - `tanstackStart.server.entry = "server"` — tells TanStack Start to use `src/server.ts` as the SSR entry.
  - `nitro.preset = "vercel"` — emits the `.vercel/output` structure.

### 17.2 Deploy
- Vercel is the target. The build emits to `.vercel/output/` (Nitro's default for the `vercel` preset).
- `.vercel/` is in the repo, containing a prior build output.

### 17.3 Observability
- **Errors**: 4 layers (see §7.4). Browser errors reach Lovable via `__lovableEvents.captureException`. Server errors are logged to console.
- **No analytics / no telemetry** is wired (no PostHog, no Mixpanel, no GA, no Sentry).
- **No health check endpoint**.

### 17.4 CI / hooks
- No GitHub Actions, no CI script in `package.json`. Lint and format are manual (`npm run lint` / `npm run format`).
- `bunfig.toml` enforces a 24h `minimumReleaseAge` supply-chain guard with explicit bypasses for `@lovable.dev/*`.

---

## 18. Environment variables & secrets

The repo includes `.env` (gitignored). The variables used by the code:

| Var | Used by | Required? | Notes |
|-----|---------|-----------|-------|
| `VITE_SUPABASE_URL` | `client.ts` | Yes (build) | Browser-side; Vite replaces at build time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `client.ts` | Yes (build) | New-style `sb_publishable_...` keys |
| `SUPABASE_URL` | `client.ts` (fallback), `client.server.ts`, `auth-middleware.ts` | Yes (server) | SSR + admin + auth verification |
| `SUPABASE_PUBLISHABLE_KEY` | same as above | Yes (server) | |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts` | Yes for admin | Bypasses RLS — server-only |
| `VITE_*` (general) | Anywhere imported as `import.meta.env.VITE_*` | varies | Standard Vite client envs |

Hard-coded fallbacks in `client.ts:40-43`:
- If the env points to the old project (`wlpiqocwxwxhnchgpqpx`) or is missing, the client is created against `https://nqtwslncjxbekupkvazu.supabase.co` with key `sb_publishable_RZvA8bEJjN5txSn6ZzSyVA_e7Qm8xc3`.

---

## 19. File inventory & metrics

### 19.1 Source tree
```
hello-neighbors/
├── .git/                                      git internals
├── .lovable/project.json                      Lovable project meta
├── .tanstack/tmp/                             TanStack build cache
├── .vercel/output/                            prior Vercel build
├── dist/                                      Vite output (gitignored)
├── docs/
│   ├── alphaxiv.md, c.md, g.md
│   ├── DO DEEP RESEARCH AGAIN _ THIS TIME _ DONT BE BIASE.md
│   ├── flick-build-prompt.md                  master 1791-line product/eng spec
│   ├── loneliness-saas-deep.md
│   ├── revenue-model.md
│   ├── strategy/moat-and-verification.md
│   └── app-architecture-report/               ← THIS REPORT
├── public/
│   ├── activedot.svg
│   ├── favicon.ico, faviconLogoFlick.png
│   ├── Flick.png
│   ├── generate_icons.js
│   ├── hotspot-dot.png                       (unreferenced)
│   ├── icon-192.png, icon-512.png
│   ├── manifest.webmanifest
│   ├── robots.txt
│   ├── sw.js                                  service worker
│   └── tlogo.svg
├── src/
│   ├── components/
│   │   ├── flick/  (7 product components)
│   │   └── ui/     (49 shadcn primitives)
│   ├── hooks/      (4 hooks)
│   ├── integrations/
│   │   ├── lovable/index.ts
│   │   └── supabase/  (5 files)
│   ├── lib/        (7 utilities)
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── _authenticated/  (10 files)
│   │   ├── auth.tsx
│   │   ├── index.tsx
│   │   ├── onboarding.tsx
│   │   ├── setup.tsx
│   │   └── README.md
│   ├── routeTree.gen.ts                       auto-generated
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── supabase/
│   ├── .temp/                                 CLI runtime cache
│   ├── config.toml
│   └── migrations/  (5 SQL files)
├── .env, .gitignore, .prettierignore, .prettierrc
├── AGENTS.md                                  Lovable agent notes
├── bun.lock, package-lock.json                both supported
├── bunfig.toml
├── components.json                            shadcn config
├── eslint.config.js
├── OneSignalSDKWorker.js                      OneSignal SW import
├── package.json
├── tmp-sw-check.mjs                           sw.js syntax check
├── tsconfig.json
└── vite.config.ts
```

### 19.2 Counts
| Category | Count |
|----------|-------|
| Pages / route files | 15 |
| Product components | 7 |
| shadcn UI primitives | 49 |
| Hooks | 4 |
| Integrations | 6 |
| Lib utilities | 7 |
| App root files (`src/`) | 5 |
| **Total `src/` files** | **93** |
| Supabase migrations | 5 |
| Public assets | 12 |
| Docs files (existing) | 8 |
| Root config files | 12 |
| Runtime deps (prod) | 55 |
| Dev deps | 17 |
| Routes (incl. sub-routes) | 15 |
| Realtime channel subscriptions across the app | 7 |
| SQL tables | 12 |
| PL/pgSQL RPCs | 7 |
| SQL triggers | 3 |

### 19.3 Longest files
- `src/routes/_authenticated/home.tsx` — 888 lines
- `src/routes/_authenticated/discover.tsx` — 511 lines
- `src/routes/_authenticated/subscription.tsx` — 503 lines
- `src/routes/_authenticated/matches.tsx` — 481 lines
- `src/routes/_authenticated/match.$matchId.tsx` — 720 lines
- `src/routes/_authenticated/profile.tsx` — 596 lines
- `src/routes/_authenticated/connections.tsx` — 396 lines
- `src/components/flick/chat-profile-sheet.tsx` — 390 lines
- `src/routes/setup.tsx` — 432 lines
- `src/routes/_authenticated/nearby.tsx` — 345 lines
- `src/routes/_authenticated/settings.tsx` — 249 lines
- `src/routes/onboarding.tsx` — 250 lines
- `src/routes/auth.tsx` — 234 lines
- `src/components/flick/avatar.tsx` — 219 lines
- `src/styles.css` — 342 lines
- `src/lib/intents.ts` — 74 lines

---

## 20. Known gotchas, TODOs, and implicit contracts

These are observations from reading every file, not commitments — the team should triage.

### 20.1 Copy / DB mismatches
- **Match window copy says 90 minutes, DB says 2 hours.** `match.$matchId.tsx:138` and `onboarding.tsx:110` and `home.tsx:694` (implicitly) all reference 90 min, but `matches.expires_at` is `now() + interval '2 hours'` and the match-reveal overlay says "90 minutes" (`match-reveal.tsx:138`). The urgency banners trigger at 30/10 min, which makes sense for a 2 h window.
- **Subscription pricing copy** says "Extended 3-hour match windows" and "Unlimited Signals" — not implemented. `subscription.tsx:267-270, 245-250`.
- **`max_radius_m` cap of 3000 m** in the settings slider vs **5 km** hard cap in the RPC. The user can only adjust up to 3 km in the UI, but the DB will accept up to 5 km. `settings.tsx:159`.

### 20.2 Code that's defined but unused
- `useAuth()` (`src/hooks/use-auth.ts`) — every route uses `supabase.auth.getUser()` directly.
- `useDebouncedValue`, `useElementSize` (`src/hooks/use-debounced.ts`) — no consumers.
- `useIsMobile()` (`src/hooks/use-mobile.tsx`) — no consumers; responsive is class-based.
- `useScrollY()` (`src/hooks/use-scroll-direction.ts:48`) — no consumers; only `useScrollDirection()` is used.
- `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`) — defined, not attached to any route.
- `supabaseAdmin` (`src/integrations/supabase/client.server.ts`) — no consumers.
- `verification_requests` table (`migration 4`) — no UI surface.
- `dpdp_consent_*` columns on profiles (`migration 4`) — no writer.
- `hotspot-dot.png` in `public/` — not referenced in source.
- The `last_active_at` column is only sometimes written. `home.tsx:248-251` writes it but swallows the `42703` "column not found" error. `match.$matchId.tsx:217-224` writes it without the swallow. `profile.tsx` doesn't write it.
- The `app-architecture-report` directory at `docs/` is new in this commit.

### 20.3 Risks
- **`profiles.delete()` is the only thing that runs on "Delete Account"** (`settings.tsx:83-102`). The auth user row in `auth.users` is not deleted; they'll still own a `signals` row that FK-cascades from `auth.users.id` — but the profile cascade is OK. However, signals/waves/matches all reference `auth.users.id` directly, so deleting the profile leaves dangling references in `signals` that will only be cleaned if `auth.users` is deleted by a server function. Currently it isn't.
- **Supabase service role key is referenced in env** but no serverFn or migration uses it. If added later, the server-side admin client will be live but the trust boundary is "only load inside server handlers" — see the comments in `client.server.ts:62-66`.
- **Geolocation permission denial is silent** on the home page (`home.tsx:194`) but loud on discover/nearby. The user may not realise their signals are still being broadcast from the cached last-known location (if any).
- **Subscription is a localStorage flag** — clearing site data or using a different device reverts the user to free. No server-side gating means the Plus features are essentially free.
- **The `signals` table does not delete on `expires_at`** — the `active` boolean is updated manually ("End signal" button), and stale rows accumulate. A scheduled job would be needed to set `active=false` on all rows past `expires_at`. The queries (`get_nearby_signals`, `count_nearby_signals`) explicitly filter `s.expires_at > now()`, so it doesn't break behaviour, but the table grows.
- **The `messages` table has no 7-day auto-delete** despite the 7-day archive comment in `match.$matchId.tsx:492`. The relaxed RLS lets you read past expiry, but the rows live forever.
- **No `tests/` directory** — zero unit, integration, or e2e tests.
- **No CI** — no GitHub Actions, no pre-commit hook.
- **`react-hook-form`, `zod`, `@hookform/resolvers` are listed as deps but not used** in any source file.
- **OneSignal worker is imported but never initialised** — `init()` is never called, so the SW is dormant.

### 20.4 Implicit contracts worth documenting
- `matches.user_a` and `matches.user_b` are always stored with `LEAST(uuid, uuid)` and `GREATEST(uuid, uuid)` (enforced in `wave_on_signal`). All code assumes this.
- `connections` rows follow the same LEAST/GREATEST convention (enforced in the `handle_keep_in_touch` trigger).
- `signals.location` is always a `POINT(lng lat)` (WKT, not lat-lng). All inserts go through `\`POINT(${lng} ${lat})\``.
- The match `expires_at` is 2 hours; the copy uses "90 minutes"; the keep-in-touch CTA appears when `mins < 60`. Treat the 1-hour mark as the practical deadline.

### 20.5 What's working well
- The whole app loads and runs without any obvious dead-ends: onboarding → sign-up → setup → home → signal → match → chat → keep-in-touch → permanent connection.
- The PostGIS RPCs are tight and well-considered (bucketed distance, blocks/reports filter, discoverable flag).
- Realtime is used thoughtfully: only the relevant table per page, with debounced reloads rather than full re-fetches.
- The Slide-to-flick interaction is a genuinely nice detail (drag handle with shimmer, haptic on completion).
- Match-reveal particle animation is custom and on-brand.
- The error capture/recovery chain (root boundary + h3 wrapper + global stash) is a thoughtful response to a real h3 bug.
- The `no-tap` utility and `safe-*` padding helpers are first-class.
- The `container-page` utility keeps every page on a 28rem max-width on mobile and expands to 56rem on desktop — the app reads as native on phones and a normal web app on larger screens.

---

*End of report. If you spot a file, migration, or contract that's drifted, update this doc and commit it alongside the change.*
