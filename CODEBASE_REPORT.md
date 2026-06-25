# Flick — Codebase Report

> Auto-generated full audit of the `hello-neighbors` application.
> Source repo: `C:\SaaS\hello-neighbors`
> Date: 2026-06-25
> Template (Lovable): `tanstack_start_ts_2026-06-17`

---

## 1. Product Snapshot

**Flick** — a mobile-first Progressive Web App that acts as an *ambient social layer for physical reality*. Users broadcast that they are present and open in a place; nearby people who are also open see a mutual signal. Zero-rejection, mutual-match only, location-aware, vibe-based.

Stack profile: **TanStack Start (React 19) + Supabase (Postgres/PostGIS/Auth) + Vercel (Nitro) + Tailwind v4 + shadcn/ui (new-york) + Lovable dev tooling**.

---

## 2. Tech Stack

### 2.1 Languages & Runtimes
- **TypeScript** 5.8.x (strict, `moduleResolution: Bundler`, target ES2022, `react-jsx`)
- **JavaScript** (ESM, `type: module`)
- **SQL** (Postgres + PostGIS migrations in `supabase/migrations/`)
- **CSS** (Tailwind v4 + CSS variables in `src/styles.css`)

### 2.2 Framework & Build
- **React** 19.2
- **React DOM** 19.2
- **TanStack Start** 1.167.x — file-based SSR framework
- **TanStack Router** 1.168.x — file-based routing (`src/routes/`)
- **TanStack React Query** 5.83.x — server-state/data layer
- **Vite** 8.0.x (via `@lovable.dev/vite-tanstack-config`)
- **Nitro** 3.0.260603-beta (server runtime, Vercel preset)
- **vite-tsconfig-paths** 6.0.x
- **Path alias**: `@/* → src/*`

### 2.3 Backend / BaaS
- **Supabase** (`@supabase/supabase-js` 2.108.x)
  - Postgres + **PostGIS** extension
  - `pgcrypto` extension
  - Auth (email/password via `auth.users`)
  - Row Level Security policies
  - Auto-generated `supabase/types.ts`
- **Cloud auth** via `@lovable.dev/cloud-auth-js` 1.1.x
- **OneSignal** — push notifications (`OneSignalSDKWorker.js` + `public/sw.js`)

### 2.4 UI / Styling
- **Tailwind CSS** 4.2.x + `@tailwindcss/vite` 4.2.x
- **shadcn/ui** (config `new-york`, base color `slate`, lucide icons) — 49 primitives in `src/components/ui/`
- **Radix UI** primitives (21 packages — accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toggle, toggle-group, tooltip)
- **lucide-react** 0.575.x — icon set
- **framer-motion** 12.40.x — animations
- **sonner** 2.0.x — toast notifications
- **embla-carousel-react** 8.6.x — carousels
- **cmdk** 1.1.x — command palette
- **vaul** 1.1.x — drawer
- **react-day-picker** 9.14.x — date picker
- **react-resizable-panels** 4.6.x — resizable layouts
- **input-otp** 1.4.x — OTP input
- **recharts** 2.15.x — charts
- **class-variance-authority** 0.7.x + **clsx** 2.1.x + **tailwind-merge** 3.5.x — utility composition

### 2.5 Forms & Validation
- **react-hook-form** 7.71.x
- **@hookform/resolvers** 5.2.x
- **zod** 3.24.x

### 2.6 Utilities
- **date-fns** 4.1.x
- **tw-animate-css** 1.3.x

### 2.7 Dev Tooling
- **ESLint** 9.32.x (flat config) + `typescript-eslint` 8.56.x + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier` + `eslint-plugin-prettier`
- **Prettier** 3.7.x (`printWidth: 100`, double quotes, trailing commas)
- **Bun** (lockfile present, `bunfig.toml` enforces `minimumReleaseAge = 86400` for supply-chain safety; allows `@lovable.dev/*` exceptions)
- **npm** (also supported — `package-lock.json` present)
- **Vercel** deployment (`.vercel/output` from prior build, Nitro preset `vercel`)

### 2.8 Scripts
| Script           | Command                        |
|------------------|--------------------------------|
| `dev`            | `vite dev`                     |
| `build`          | `vite build`                   |
| `build:dev`      | `vite build --mode development`|
| `preview`        | `vite preview`                 |
| `lint`           | `eslint .`                     |
| `format`         | `prettier --write .`           |

---

## 3. Complete Folder Structure

Excludes `node_modules`, `dist`, `.git`, `.vercel/output`, `.tanstack/tmp`, generated chunks.

```
hello-neighbors/
├── .git/                              (git internals — not in audit)
├── .lovable/
│   └── project.json                   (Lovable project meta, template id)
├── .tanstack/
│   └── tmp/                           (TanStack build cache — not in audit)
├── .vercel/
│   └── output/                        (prior Vercel build — not in audit)
├── dist/                              (Vite output — not in audit)
├── docs/
│   ├── alphaxiv.md
│   ├── c.md
│   ├── DO DEEP RESEARCH AGAIN _ THIS TIME _ DONT BE BIASE.md
│   ├── flick-build-prompt.md
│   ├── g.md
│   ├── loneliness-saas-deep.md
│   ├── revenue-model.md
│   └── strategy/
│       └── moat-and-verification.md
├── public/
│   ├── activedot.svg
│   ├── favicon.ico
│   ├── faviconLogoFlick.png
│   ├── Flick.png
│   ├── generate_icons.js
│   ├── hotspot-dot.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.webmanifest
│   ├── robots.txt
│   ├── sw.js                          (Service Worker)
│   └── tlogo.svg
├── src/
│   ├── components/
│   │   ├── flick/                     (7 product components)
│   │   │   ├── app-shell.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── avatar-picker.tsx
│   │   │   ├── chat-profile-sheet.tsx
│   │   │   ├── live-pulse.tsx
│   │   │   ├── match-reveal.tsx
│   │   │   └── pwa-install-prompt.tsx
│   │   └── ui/                        (49 shadcn primitives)
│   │       ├── accordion.tsx
│   │       ├── alert.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── aspect-ratio.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── breadcrumb.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── carousel.tsx
│   │       ├── chart.tsx
│   │       ├── checkbox.tsx
│   │       ├── collapsible.tsx
│   │       ├── command.tsx
│   │       ├── context-menu.tsx
│   │       ├── dialog.tsx
│   │       ├── drawer.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── hover-card.tsx
│   │       ├── input-otp.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── menubar.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── pagination.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── radio-group.tsx
│   │       ├── resizable.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── sonner.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toggle-group.tsx
│   │       ├── toggle.tsx
│   │       └── tooltip.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-debounced.ts
│   │   ├── use-mobile.tsx
│   │   └── use-scroll-direction.ts
│   ├── integrations/
│   │   ├── lovable/
│   │   │   └── index.ts
│   │   └── supabase/
│   │       ├── auth-attacher.ts
│   │       ├── auth-middleware.ts
│   │       ├── client.server.ts
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib/
│   │   ├── avatars.ts
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   ├── geocode.ts
│   │   ├── intents.ts
│   │   ├── lovable-error-reporting.ts
│   │   └── utils.ts
│   ├── routes/
│   │   ├── __root.tsx                 (root layout)
│   │   ├── _authenticated/
│   │   │   ├── route.tsx              (auth-gated layout)
│   │   │   ├── blocked.tsx
│   │   │   ├── connections.tsx
│   │   │   ├── discover.tsx
│   │   │   ├── home.tsx
│   │   │   ├── match.$matchId.tsx     (dynamic :matchId)
│   │   │   ├── matches.tsx
│   │   │   ├── nearby.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── settings.tsx
│   │   │   └── subscription.tsx
│   │   ├── auth.tsx
│   │   ├── index.tsx
│   │   ├── onboarding.tsx
│   │   ├── setup.tsx
│   │   └── README.md
│   ├── routeTree.gen.ts               (auto-generated by TanStack Router)
│   ├── router.tsx
│   ├── server.ts                      (SSR server entry)
│   ├── start.ts
│   └── styles.css
├── supabase/
│   ├── .temp/                         (CLI runtime cache — not in audit)
│   ├── config.toml
│   └── migrations/
│       ├── 20260624075315_3c367fa0-60cf-4f79-9508-c89cb4d92562.sql   (initial schema)
│       ├── 20260624082900_connections.sql
│       ├── 20260624090000_interests_settings_blocks.sql
│       ├── 20260624151800_trust_and_safety.sql
│       └── 20260624200000_mutes_reactions_notes.sql
├── .env                               (env vars, untracked)
├── .gitignore
├── .prettierignore
├── .prettierrc
├── AGENTS.md
├── OneSignalSDKWorker.js
├── bun.lock
├── bunfig.toml
├── components.json                    (shadcn config)
├── eslint.config.js
├── package-lock.json
├── package.json
├── tmp-sw-check.mjs
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Pages / Routes

**Total route files: 15** (1 root layout + 1 auth-gated layout + 13 pages).

Routing is **file-based** via TanStack Router. `_authenticated` is a pathless layout that gates child routes behind auth.

| URL                       | File                                       | Layout / Page | Purpose                                             |
|---------------------------|--------------------------------------------|---------------|-----------------------------------------------------|
| `/`                       | `src/routes/index.tsx`                     | Page          | Landing / entry                                     |
| `/onboarding`             | `src/routes/onboarding.tsx`                | Page          | First-run onboarding flow                           |
| `/setup`                  | `src/routes/setup.tsx`                     | Page          | Profile / location setup                            |
| `/auth`                   | `src/routes/auth.tsx`                      | Page          | Sign-in / sign-up                                   |
| `/` (shell)               | `src/routes/__root.tsx`                    | Root layout   | App shell, `<Outlet />`                              |
| `/_authenticated` (shell) | `src/routes/_authenticated/route.tsx`      | Auth layout   | Gate children behind session                        |
| `/home`                   | `src/routes/_authenticated/home.tsx`       | Page          | Main home / presence                                |
| `/discover`               | `src/routes/_authenticated/discover.tsx`   | Page          | Browse signals nearby                              |
| `/nearby`                 | `src/routes/_authenticated/nearby.tsx`     | Page          | Map / list of nearby users                          |
| `/matches`                | `src/routes/_authenticated/matches.tsx`    | Page          | Mutual matches list                                 |
| `/match/:matchId`         | `src/routes/_authenticated/match.$matchId.tsx` | Page       | Single match detail / chat                          |
| `/connections`            | `src/routes/_authenticated/connections.tsx`| Page          | Connected people                                    |
| `/profile`                | `src/routes/_authenticated/profile.tsx`    | Page          | User profile                                        |
| `/settings`               | `src/routes/_authenticated/settings.tsx`   | Page          | App settings                                        |
| `/subscription`           | `src/routes/_authenticated/subscription.tsx`| Page         | Premium tier                                        |
| `/blocked`                | `src/routes/_authenticated/blocked.tsx`     | Page          | Blocked users list                                  |

> Convention reference: `src/routes/README.md`.

---

## 5. Components

**Total component files: 56** (7 product + 49 shadcn).

### 5.1 Product components — `src/components/flick/` (7)
| File                          | Role                                                    |
|-------------------------------|---------------------------------------------------------|
| `app-shell.tsx`               | Global app shell wrapping the authenticated app        |
| `avatar.tsx`                  | User avatar rendering                                  |
| `avatar-picker.tsx`           | Avatar / emoji picker during onboarding                |
| `chat-profile-sheet.tsx`      | Slide-over profile sheet inside a match chat           |
| `live-pulse.tsx`              | Animated "I'm open" pulse indicator                    |
| `match-reveal.tsx`            | Mutual-match reveal animation                          |
| `pwa-install-prompt.tsx`      | PWA install prompt UI                                  |

### 5.2 shadcn UI primitives — `src/components/ui/` (49)
Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip.

---

## 6. Hooks — `src/hooks/` (4)
| File                       | Purpose                                                |
|----------------------------|--------------------------------------------------------|
| `use-auth.ts`              | Session / auth state helpers                          |
| `use-debounced.ts`         | Debounced value                                        |
| `use-mobile.tsx`           | Responsive mobile breakpoint hook                      |
| `use-scroll-direction.ts`  | Detect scroll up/down (for hide-on-scroll UI)          |

---

## 7. Integrations — `src/integrations/` (6)

### 7.1 `supabase/` (5)
| File                  | Purpose                                                |
|-----------------------|--------------------------------------------------------|
| `client.ts`           | Browser Supabase client                                |
| `client.server.ts`    | Server Supabase client (TanStack Start SSR)            |
| `auth-middleware.ts`  | Auth middleware / route guards                          |
| `auth-attacher.ts`    | Attaches Supabase auth tokens to outgoing requests     |
| `types.ts`            | Auto-generated DB types                                |

### 7.2 `lovable/` (1)
| File      | Purpose                                                |
|-----------|--------------------------------------------------------|
| `index.ts`| Lovable platform glue                                  |

---

## 8. Library / Utilities — `src/lib/` (7)
| File                          | Purpose                                          |
|-------------------------------|--------------------------------------------------|
| `utils.ts`                    | `cn()` class composer + shadcn helpers          |
| `avatars.ts`                  | Avatar / emoji mapping                           |
| `intents.ts`                  | Vibe / intent taxonomy for signals               |
| `geocode.ts`                  | Geocoding helpers                                |
| `error-capture.ts`            | Client error capture                             |
| `error-page.ts`               | Error page component                             |
| `lovable-error-reporting.ts`  | Lovable error reporter                           |

---

## 9. App Root Files — `src/` (5)
| File                  | Purpose                                                       |
|-----------------------|---------------------------------------------------------------|
| `router.tsx`          | Creates the TanStack router + React Query client              |
| `routeTree.gen.ts`    | Auto-generated route tree (do not edit)                       |
| `start.ts`            | TanStack Start entry point                                    |
| `server.ts`           | Nitro SSR server entry (referenced from `vite.config.ts`)     |
| `styles.css`          | Tailwind v4 entry + shadcn CSS variables                      |

---

## 10. Supabase (Backend) — `supabase/`

- `config.toml` → `project_id = "nqtwslncjxbekupkvazu"`
- 5 SQL migrations in `supabase/migrations/`:
  1. `20260624075315_3c367fa0-60cf-4f79-9508-c89cb4d92562.sql` — initial schema (PostGIS, `pgcrypto`, `profiles`, `signals`, `waves`, `matches`, `messages`, RLS policies, `handle_new_user`, `wave_on_signal`, `get_nearby_signals`)
  2. `20260624082900_connections.sql` — connections table
  3. `20260624090000_interests_settings_blocks.sql` — interests / settings / blocks
  4. `20260624151800_trust_and_safety.sql` — trust & safety
  5. `20260624200000_mutes_reactions_notes.sql` — mutes / reactions / notes

---

## 11. Public Assets — `public/` (12)
`activedot.svg`, `favicon.ico`, `faviconLogoFlick.png`, `Flick.png`, `generate_icons.js`, `hotspot-dot.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`, `robots.txt`, `sw.js`, `tlogo.svg`.

---

## 12. Docs — `docs/` (8)
`alphaxiv.md`, `c.md`, `DO DEEP RESEARCH AGAIN _ THIS TIME _ DONT BE BIASE.md`, `flick-build-prompt.md` (the master 1791-line product/eng spec), `g.md`, `loneliness-saas-deep.md`, `revenue-model.md`, `strategy/moat-and-verification.md`.

---

## 13. Root Config Files (8)
| File                     | Purpose                                                                                |
|--------------------------|----------------------------------------------------------------------------------------|
| `package.json`           | Manifest, scripts, deps (see §2)                                                       |
| `tsconfig.json`          | TS strict, `@/*` path alias, react-jsx, target ES2022                                  |
| `vite.config.ts`         | Wraps `@lovable.dev/vite-tanstack-config`; sets Nitro preset to `vercel`               |
| `eslint.config.js`       | Flat ESLint config (TS + React Hooks + Prettier)                                       |
| `.prettierrc`            | `printWidth: 100`, double quotes, trailing commas                                      |
| `.prettierignore`        | Ignores `routeTree.gen.ts`, lockfiles, build dirs                                      |
| `bunfig.toml`            | Bun 24h `minimumReleaseAge` with `@lovable.dev/*` exceptions                           |
| `components.json`        | shadcn/ui config (`new-york`, slate, lucide, `@/components`, `@/lib/utils`)            |
| `.gitignore`             | Standard Next/Vinxi/Vercel ignores                                                     |
| `AGENTS.md`              | Lovable project agent notes (don't rewrite published history)                          |
| `OneSignalSDKWorker.js`  | OneSignal v16 SDK worker import                                                        |
| `tmp-sw-check.mjs`       | Service worker check script (utility)                                                  |

---

## 14. Totals

| Category                  | Count |
|---------------------------|-------|
| Pages / route files       | 15    |
| Product components        | 7     |
| shadcn UI primitives      | 49    |
| Hooks                     | 4     |
| Integrations              | 6     |
| Lib utilities             | 7     |
| App root files (`src/`)   | 5     |
| **Total `src/` files**    | **94**|
| Supabase migrations       | 5     |
| Public assets             | 12    |
| Docs files                | 8     |
| Root config files         | 12    |
| Runtime deps (prod)       | 55    |
| Dev deps                  | 17    |

---

## 15. Architectural Notes

- **SSR**: TanStack Start with Nitro server, SSR entry redirected to `src/server.ts` via `vite.config.ts` (`tanstackStart.server.entry = "server"`).
- **Hosting**: Vercel (Nitro preset `vercel`); build output already present in `.vercel/output/`.
- **Auth gate**: `_authenticated/route.tsx` is a pathless layout that wraps all post-login pages.
- **State**: React Query (`@tanstack/react-query`) instantiated once in `router.tsx`, threaded through `router.context.queryClient`.
- **Database**: PostGIS for radius search (`get_nearby_signals(lat, lon, limit)`) and `pgcrypto` for UUIDs. RLS enforced on all tables.
- **PWA**: Service worker in `public/sw.js`, manifest in `public/manifest.webmanifest`, install prompt in `src/components/flick/pwa-install-prompt.tsx`.
- **Push notifications**: OneSignal v16 (loaded via CDN in `OneSignalSDKWorker.js`).
- **Styling**: Tailwind v4 (Vite plugin), CSS variables in `src/styles.css`, shadcn `new-york` style with slate base, lucide icons.
