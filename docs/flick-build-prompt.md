# FLICK — The Complete AI Build Prompt

## Master Engineering, Product & Architecture Document for AI-Assisted Development

### Version 1.0 — June 2026

---

> **HOW TO USE THIS DOCUMENT:**
> Paste this entire prompt into any AI coding agent (Cursor, Lovable, Bolt, Claude, GPT-4o with tools, Gemini Advanced) and instruct it: _"Build this application end to end. Do not skip any section. Do not use mock data. Do not hardcode anything. Every feature must work. Follow every instruction exactly."_

---

## PRIME DIRECTIVE

You are building **Flick** — a mobile-first Progressive Web Application that solves the single largest structural problem of the 21st century: the collapse of spontaneous, serendipitous, low-stakes human social contact in physical space.

This is not a loneliness app. It is not a dating app. It is not a social network. It is the **ambient social layer for physical reality** — the operating system for the social life of physical space. Users never say "I downloaded an app to find friends." They say "I was getting coffee and bumped into someone interesting." Flick makes that happen by design, at scale, systematically.

**The core mechanic:** You broadcast that you are present and open, right now, in this place. People nearby who are also open see a signal — but only if they also say yes. You never see who didn't respond. No rejection. No social cost. No vulnerability. Just the magic of two people discovering they were three meters apart and had something to share.

**Non-negotiable design constraints from psychology research:**

1. Zero rejection signals — users must NEVER be able to see who did not match with them
2. Mutual-match visibility only — both must signal before either sees the other
3. Ephemerality by default — no permanent discovery footprint
4. No "loneliness" framing — ever, in any copy, anywhere
5. Intent-first — every interaction is anchored to a real-world activity/context, not a profile

---

## PART 1: PRODUCT DEFINITION

### 1.1 Product Name & Identity

- **Name:** Flick
- **Tagline:** _"Be here. Find people."_
- **Category:** Ambient Social Discovery / Real-World Experience Platform
- **Platform:** Progressive Web App (PWA) — Mobile-First, fully responsive
- **Target Users:** Urban young adults (18–32), college students, young professionals, people who have recently relocated to a new city
- **Primary Markets (Phase 1):** Tier-1 Indian cities — Bangalore, Delhi, Hyderabad, Pune, Mumbai

### 1.2 Problem Statement

The physical infrastructure that historically generated human social bonds — third places (cafes, religious spaces, community halls), shared commutes, neighborhood proximity, civic organizations — has collapsed across urban India. What remains is:

- 150M+ people who have relocated to cities in the last decade with no social infrastructure in their new location
- Digital social networks (WhatsApp, Instagram) that connect declared relationships but cannot bridge new connections
- AI companion apps that fill the void short-term while deepening the deficit long-term
- No software layer that makes the physical social environment legible and actionable

**The gap:** Nobody has bridged a person's physical ambient environment (who is literally here right now, open to contact) with their digital identity. This bridge does not exist. Flick builds it.

### 1.3 Core Value Proposition

| For the User                            | For the Venue                            | For Society                                 |
| --------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Never initiate awkwardly again          | Drive foot traffic through social cachet | Rebuild bridging social capital             |
| Meet people without saying "I'm lonely" | Get discovered by socially active users  | Convert strangers to neighbors to community |
| Organic connection in real contexts     | Belong to a "warm spot" network          | Reduce the loneliness epidemic structurally |

---

## PART 2: TECH STACK

### 2.1 Frontend

```
Framework:          React 19 + TypeScript 5.4
Build Tool:         Vite 5.x (fastest builds, HMR)
Styling:            Tailwind CSS v4 (OKLCH color system)
Component Library:  shadcn/ui v4 (Radix UI primitives)
Animations:         Framer Motion 11 (spring physics)
Icons:              Lucide React (consistent, clean)
State Management:   Zustand 5.x (lightweight, fast)
Data Fetching:      TanStack Query v5 (React Query)
Forms:              React Hook Form + Zod validation
PWA:                Vite PWA Plugin (vite-plugin-pwa) + Workbox
Routing:            React Router v7
Maps:               Mapbox GL JS (or Leaflet as fallback)
Geolocation:        Browser Geolocation API + background sync
Push Notifications: Web Push API (VAPID keys)
Real-time:          Socket.io Client
```

### 2.2 Backend

```
Runtime:            Node.js 22 LTS
Framework:          FastAPI (Python 3.12) for ML-heavy routes
                    OR Express.js 5.x for primary API (pick one stack)
                    RECOMMENDATION: Hono.js (ultrafast, edge-compatible)
Database:           PostgreSQL 16 (primary relational data)
                    Redis 7 (real-time presence, sessions, rate limiting)
                    PostGIS extension (geospatial queries)
ORM:                Drizzle ORM (type-safe, fast, modern)
Auth:               Supabase Auth OR Clerk (phone OTP + Google OAuth)
File Storage:       Supabase Storage (profile photos, media)
Real-time:          Supabase Realtime OR Socket.io Server
Push Notifications: Web Push Library (Node) + VAPID
Email:              Resend (transactional email)
SMS/OTP:            Twilio Verify API (Indian phone numbers)
```

### 2.3 Infrastructure

```
Hosting (Frontend): Vercel (auto-deploys, edge CDN, free tier)
Hosting (Backend):  Railway.app OR Render.com (free to start, scales)
Database Hosting:   Supabase (PostgreSQL + PostGIS + Realtime + Auth)
CDN:                Cloudflare (free, global edge)
Monitoring:         Sentry (error tracking, free tier)
Analytics:          PostHog (product analytics, GDPR-compliant, free)
Cron Jobs:          Upstash QStash (serverless scheduled tasks)
Rate Limiting:      Upstash Redis (edge rate limiting)
```

### 2.4 AI/ML Layer

```
Interest Clustering:    OpenAI Embeddings API (text-embedding-3-small)
                        OR HuggingFace Inference API (free tier)
Compatibility Scoring:  Custom cosine similarity (simple, no AI needed for MVP)
Content Moderation:     OpenAI Moderation API (free)
Intent Classification:  Simple keyword matching for MVP,
                        upgrade to fine-tuned model post-PMF
```

### 2.5 Complete Dependency List

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "typescript": "^5.4.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "socket.io-client": "^4.7.0",
    "mapbox-gl": "^3.5.0",
    "@supabase/supabase-js": "^2.44.0",
    "date-fns": "^3.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "vite-plugin-pwa": "^0.20.0",
    "workbox-window": "^7.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0"
  }
}
```

---

## PART 3: SYSTEM ARCHITECTURE

### 3.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (PWA)                            │
│  React 19 + TypeScript + Vite + Tailwind v4 + Framer Motion           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Auth Flow  │  │  Signal Flow  │  │  Match Flow  │  │  Map Flow │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────┼────────────────┼─────────────────┼────────────────┼─────────┘
          │                │                 │                │
          ▼                ▼                 ▼                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                             │
│  Hono.js REST API + WebSocket Server (Socket.io)                       │
│  Rate Limiting (Upstash Redis) + Auth Middleware (Supabase JWT)        │
│  ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ /auth/*    │  │ /signals/*  │  │ /matches/* │  │ /venues/*    │  │
│  │ /users/*   │  │ /discover/* │  │ /chat/*    │  │ /analytics/* │  │
│  └────────────┘  └─────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          ▼                       ▼                         ▼
┌─────────────────┐  ┌────────────────────────┐  ┌─────────────────────┐
│   PostgreSQL 16  │  │   Redis 7 (Upstash)    │  │  Supabase Realtime  │
│   + PostGIS      │  │   Presence Engine      │  │  WebSocket Pub/Sub  │
│   (Supabase)     │  │   Rate Limiting        │  │  Broadcast Channels │
│                  │  │   Sessions/Cache        │  │  Presence Tracking  │
└─────────────────┘  └────────────────────────┘  └─────────────────────┘
```

### 3.2 Data Flow Diagram — Signal Lifecycle

```
USER OPENS APP
      │
      ▼
[Browser Geolocation API]
      │
      ├── Permission DENIED → Show permission request screen
      │
      └── Permission GRANTED
              │
              ▼
      [Location obtained: lat, lng, accuracy]
              │
              ▼
      [User creates Signal]
      Intent: "studying for GATE, could use company"
      Radius: 1km (default) / 500m / 2km
      Duration: 90 min (default) / 60 / 120
      Tags: #study #coffee #GATE
              │
              ▼
      [POST /api/signals]
      Payload: { userId, lat, lng, intent, tags, radius, duration, expiresAt }
              │
              ▼
      [Backend: Geospatial Query]
      PostGIS: ST_DWithin(user_location, signal_location, radius)
      Filter: active signals only, same campus/venue optionally
      Exclude: already-matched users, blocked users, expired signals
              │
              ▼
      [Backend: Mutual Match Check]
      For each nearby signal:
        IF signal_owner has ALSO set "visible to people like this user"
        → Queue for potential match consideration
        (NO notification sent yet — MUTUAL requirement)
              │
              ▼
      [Real-time: Supabase Realtime / Socket.io]
      Push to signal owner: "X people are nearby and open"
      (COUNT only — no identities revealed yet)
              │
              ▼
      [User taps "Show me"]
      → Client sends acknowledgment signal
              │
              ▼
      [Backend: Mutual Acknowledgment]
      IF both users have now acknowledged each other's presence:
        → Create match record
        → Reveal profiles to each other
        → Open 90-minute chat window
        → Send push notification to both
              │
              ▼
      [90-MINUTE WINDOW]
      Full chat enabled
      Profile visible
      Shared venue visible on map
              │
              ▼
      [Window Expires]
      Chat archived (accessible for 7 days, then deleted)
      Profiles disappear from each other's proximity view
      No permanent record unless both explicitly connect
              │
              ▼
      [Post-Match: Optional Connection]
      Both users can tap "Keep in touch"
      IF both tap → permanent connection formed
      IF only one taps → nothing shown (no rejection signal)
```

### 3.3 Data Flow Diagram — Venue Discovery

```
VENUE ONBOARDING (B2B Flow):
Venue Admin → /venues/register → Backend creates venue record
Venue gets: Flick Venue Dashboard, analytics, "Warm Spot" badge

USER NEARBY FLOW:
User opens map tab → PostGIS query for venues within 2km
Venues with active Flick signals shown as "warm spots"
Warm spot: venue has ≥3 active signals in last 30 min
User taps venue → sees signal count (not identities)
User can check in to venue to join venue's ambient presence pool
```

### 3.4 Database Schema (PostgreSQL + PostGIS)

```sql
-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for text search

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) UNIQUE,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(160),
  verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USER PROFILES (extended)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  gender VARCHAR(20),
  university VARCHAR(100),
  occupation VARCHAR(100),
  interests TEXT[], -- array of interest tags
  embedding VECTOR(1536), -- OpenAI embedding for interest matching
  signals_sent INTEGER DEFAULT 0,
  matches_made INTEGER DEFAULT 0,
  reputation_score FLOAT DEFAULT 5.0,
  last_seen_at TIMESTAMP,
  location GEOGRAPHY(POINT, 4326) -- PostGIS geography type
);

-- SIGNALS (the core entity)
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  intent TEXT NOT NULL CHECK (char_length(intent) <= 140),
  tags TEXT[],
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_meters INTEGER DEFAULT 1000 CHECK (radius_meters IN (500, 1000, 2000)),
  duration_minutes INTEGER DEFAULT 90 CHECK (duration_minutes IN (60, 90, 120)),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  venue_id UUID REFERENCES venues(id),
  acknowledge_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Geospatial index for fast proximity queries
CREATE INDEX signals_location_idx ON signals USING GIST(location);
CREATE INDEX signals_active_expires_idx ON signals(is_active, expires_at);

-- ACKNOWLEDGMENTS (mutual match mechanism)
CREATE TABLE acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_user_id, to_signal_id)
);

-- MATCHES (created when BOTH sides acknowledge)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  signal_a_id UUID REFERENCES signals(id),
  signal_b_id UUID REFERENCES signals(id),
  match_type VARCHAR(20) DEFAULT 'mutual_signal',
  window_expires_at TIMESTAMP NOT NULL,
  is_window_active BOOLEAN DEFAULT true,
  user_a_kept_touch BOOLEAN DEFAULT false,
  user_b_kept_touch BOOLEAN DEFAULT false,
  permanent_connection BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MESSAGES (ephemeral chat)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  message_type VARCHAR(20) DEFAULT 'text', -- text, emoji_reaction, location_share
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- VENUES (B2B layer)
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  venue_type VARCHAR(50), -- cafe, coworking, library, gym, park, campus
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  verified BOOLEAN DEFAULT false,
  subscription_tier VARCHAR(20) DEFAULT 'free', -- free, basic, premium
  owner_email VARCHAR(255),
  flick_venue_tag BOOLEAN DEFAULT false,
  monthly_signal_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX venues_location_idx ON venues USING GIST(location);

-- BLOCKS
CREATE TABLE blocks (
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(blocker_id, blocked_id)
);

-- REPORTS
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id),
  reported_user_id UUID REFERENCES users(id),
  reason VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- PUSH SUBSCRIPTIONS (Web Push)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS EVENTS
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_name VARCHAR(100) NOT NULL,
  properties JSONB,
  session_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 API Routes (Complete)

```
AUTH
POST   /api/auth/send-otp          Send OTP to phone number
POST   /api/auth/verify-otp         Verify OTP, return JWT
POST   /api/auth/google             Google OAuth callback
POST   /api/auth/refresh            Refresh JWT token
POST   /api/auth/logout             Invalidate session

USERS
GET    /api/users/me                Get current user profile
PATCH  /api/users/me                Update profile
POST   /api/users/me/avatar         Upload profile photo
DELETE /api/users/me                Delete account (GDPR)
GET    /api/users/:id               Get public profile (limited fields)
POST   /api/users/me/interests      Update interest tags

SIGNALS
POST   /api/signals                 Create a new signal
GET    /api/signals/mine            Get my active signals
DELETE /api/signals/:id             Deactivate my signal
GET    /api/signals/nearby          Get nearby signals count (not identities)
POST   /api/signals/:id/acknowledge Acknowledge a signal (mutual match attempt)

MATCHES
GET    /api/matches                 Get all my matches
GET    /api/matches/:id             Get specific match details
POST   /api/matches/:id/keep-touch  Toggle "keep in touch" for this match

MESSAGES
GET    /api/messages/:matchId       Get messages for a match (paginated)
POST   /api/messages/:matchId       Send a message
DELETE /api/messages/:messageId     Delete a message

VENUES
GET    /api/venues/nearby           Get venues near location
GET    /api/venues/:id              Get venue details + signal count
POST   /api/venues                  Create venue (admin only / B2B)
GET    /api/venues/:id/signals      Get active signal count at venue (not identities)

DISCOVERY
GET    /api/discover/map            Get warm spots + signal density for map
GET    /api/discover/activity       Get recent activity feed (anonymized)

SAFETY
POST   /api/safety/report           Report a user
POST   /api/safety/block            Block a user
GET    /api/safety/blocked          Get blocked users list

PUSH
POST   /api/push/subscribe          Register push subscription
DELETE /api/push/unsubscribe        Remove push subscription

ANALYTICS (internal)
POST   /api/analytics/event         Track product analytics event

ADMIN
GET    /api/admin/signals           Admin: all active signals
GET    /api/admin/reports           Admin: pending reports
PATCH  /api/admin/users/:id         Admin: moderate user
```

### 3.6 WebSocket Events (Socket.io)

```javascript
// CLIENT EMITS
socket.emit("join_discovery", { lat, lng, radius }); // join geo channel
socket.emit("signal_created", { signalId }); // notify nearby users of new signal
socket.emit("signal_acknowledge", { signalId }); // acknowledge nearby signal
socket.emit("message_send", { matchId, content }); // send chat message
socket.emit("typing_start", { matchId }); // typing indicator
socket.emit("typing_stop", { matchId }); // stop typing indicator
socket.emit("presence_update", { lat, lng }); // update location

// SERVER EMITS
socket.emit("nearby_count_update", { count }); // how many signals near you
socket.emit("match_created", { matchId, profile }); // you have a new match!
socket.emit("message_received", { message }); // new message in chat
socket.emit("window_expiring", { matchId, minutesLeft }); // 15 min warning
socket.emit("window_expired", { matchId }); // chat window closed
socket.emit("signal_expired", { signalId }); // your signal expired
```

---

## PART 4: FOLDER STRUCTURE

```
flick/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker (auto-generated by Vite PWA)
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   └── screenshots/               # PWA install screenshots
│
├── src/
│   ├── main.tsx                   # App entry point
│   ├── App.tsx                    # Root component, router setup
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client
│   │   ├── socket.ts              # Socket.io client setup
│   │   ├── queryClient.ts         # TanStack Query client config
│   │   ├── axios.ts               # Axios instance with interceptors
│   │   ├── utils.ts               # clsx, cn, formatters
│   │   ├── constants.ts           # App-wide constants
│   │   └── geo.ts                 # Geolocation utilities
│   │
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── signal.types.ts
│   │   ├── match.types.ts
│   │   ├── message.types.ts
│   │   ├── venue.types.ts
│   │   └── api.types.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts          # Zustand: current user, auth state
│   │   ├── signal.store.ts        # Zustand: active signal, nearby count
│   │   ├── match.store.ts         # Zustand: matches, messages
│   │   ├── geo.store.ts           # Zustand: user location, map state
│   │   └── ui.store.ts            # Zustand: modals, toasts, bottom sheets
│   │
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication logic
│   │   ├── useGeolocation.ts      # Real-time geolocation
│   │   ├── useSignal.ts           # Signal CRUD + lifecycle
│   │   ├── useMatches.ts          # Matches fetching + socket sync
│   │   ├── useMessages.ts         # Real-time messages
│   │   ├── useNearby.ts           # Nearby signal count
│   │   ├── usePushNotifications.ts # Web Push setup
│   │   ├── useVenues.ts           # Venue discovery
│   │   └── useAnalytics.ts        # Product analytics
│   │
│   ├── services/
│   │   ├── auth.service.ts        # Auth API calls
│   │   ├── signal.service.ts      # Signal API calls
│   │   ├── match.service.ts       # Match API calls
│   │   ├── message.service.ts     # Message API calls
│   │   ├── venue.service.ts       # Venue API calls
│   │   ├── push.service.ts        # Push notification registration
│   │   └── analytics.service.ts   # Event tracking
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base components (do not modify)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── tooltip.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx     # App shell with bottom nav
│   │   │   ├── BottomNav.tsx      # Primary navigation
│   │   │   ├── TopBar.tsx         # Context-aware top bar
│   │   │   └── SafeArea.tsx       # iOS safe area wrapper
│   │   │
│   │   ├── auth/
│   │   │   ├── PhoneInput.tsx     # Phone number input with country code
│   │   │   ├── OTPInput.tsx       # 6-digit OTP input (custom, not cliché)
│   │   │   └── AuthGuard.tsx      # Route protection
│   │   │
│   │   ├── signal/
│   │   │   ├── SignalComposer.tsx  # Create/edit signal bottom sheet
│   │   │   ├── SignalCard.tsx      # Single signal display
│   │   │   ├── SignalPulse.tsx     # Animated pulse ring (active signal indicator)
│   │   │   ├── SignalTimer.tsx     # Countdown to signal expiry
│   │   │   ├── IntentInput.tsx     # Natural language intent input
│   │   │   ├── TagSelector.tsx     # Interest tag selector
│   │   │   └── RadiusSelector.tsx  # Distance radius picker
│   │   │
│   │   ├── discover/
│   │   │   ├── NearbyCounter.tsx   # "X people nearby and open" display
│   │   │   ├── MapView.tsx         # Mapbox map with warm spots
│   │   │   ├── WarmSpotMarker.tsx  # Venue marker component
│   │   │   ├── ActivityFeed.tsx    # Anonymized activity feed
│   │   │   └── DiscoverEmpty.tsx   # Empty state (motivating, not sad)
│   │   │
│   │   ├── match/
│   │   │   ├── MatchReveal.tsx     # Animated match reveal screen
│   │   │   ├── MatchCard.tsx       # Match list item
│   │   │   ├── MatchTimer.tsx      # 90-min window countdown
│   │   │   └── ConnectionPrompt.tsx # "Keep in touch?" prompt
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # Full chat interface
│   │   │   ├── MessageBubble.tsx   # Single message display
│   │   │   ├── MessageInput.tsx    # Text input with emoji + send
│   │   │   ├── TypingIndicator.tsx # Animated typing dots
│   │   │   └── ChatExpired.tsx     # Post-window expired state
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx     # Public profile display
│   │   │   ├── AvatarUpload.tsx    # Photo upload with crop
│   │   │   ├── InterestTags.tsx    # Tag display + edit
│   │   │   └── ReputationScore.tsx # Score display
│   │   │
│   │   ├── venue/
│   │   │   ├── VenueCard.tsx       # Venue discovery card
│   │   │   ├── VenueSignalCount.tsx # Signal count at venue
│   │   │   └── VenueCheckIn.tsx    # Check-in button
│   │   │
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx   # Global loading spinner
│   │       ├── ErrorBoundary.tsx    # React error boundary
│   │       ├── EmptyState.tsx       # Reusable empty state
│   │       ├── ConfirmDialog.tsx    # Confirmation modal
│   │       ├── LocationPermission.tsx # Location access request
│   │       ├── OfflineIndicator.tsx # PWA offline state
│   │       └── PullToRefresh.tsx    # Mobile pull-to-refresh
│   │
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── SplashScreen.tsx         # App launch screen
│   │   │   ├── OnboardingWelcome.tsx    # "Be here. Find people."
│   │   │   ├── OnboardingHow.tsx        # How Flick works (3 steps)
│   │   │   ├── OnboardingPrivacy.tsx    # "You're invisible until both say yes"
│   │   │   └── OnboardingPermissions.tsx # Location + notifications request
│   │   │
│   │   ├── auth/
│   │   │   ├── AuthScreen.tsx           # Phone/Google auth entry
│   │   │   ├── PhoneVerifyScreen.tsx    # OTP verification
│   │   │   └── AuthCallbackScreen.tsx   # OAuth callback handler
│   │   │
│   │   ├── profile-setup/
│   │   │   ├── SetupName.tsx            # Display name
│   │   │   ├── SetupPhoto.tsx           # Profile photo
│   │   │   ├── SetupInterests.tsx       # Interest tags (min 3)
│   │   │   ├── SetupBio.tsx             # One-line bio
│   │   │   └── SetupComplete.tsx        # "You're ready" confirmation
│   │   │
│   │   ├── home/
│   │   │   └── HomeScreen.tsx           # Main hub: signal + nearby count
│   │   │
│   │   ├── discover/
│   │   │   └── DiscoverScreen.tsx       # Map + warm spots + activity
│   │   │
│   │   ├── matches/
│   │   │   ├── MatchesScreen.tsx        # All matches list
│   │   │   └── MatchDetailScreen.tsx    # Single match + chat
│   │   │
│   │   ├── connections/
│   │   │   └── ConnectionsScreen.tsx    # Permanent connections list
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx        # My profile view
│   │   │   └── ProfileEditScreen.tsx    # Edit profile
│   │   │
│   │   └── settings/
│   │       ├── SettingsScreen.tsx       # Main settings
│   │       ├── PrivacySettings.tsx      # Privacy controls
│   │       ├── NotificationSettings.tsx # Push notification prefs
│   │       ├── BlockedUsersScreen.tsx   # Block list management
│   │       ├── AccountSettings.tsx      # Account + delete account
│   │       └── HelpScreen.tsx           # Help + safety guidelines
│   │
│   ├── styles/
│   │   ├── globals.css            # Global styles + CSS variables (design tokens)
│   │   └── animations.css         # Keyframe animations
│   │
│   └── config/
│       ├── pwa.config.ts          # PWA manifest + cache strategies
│       └── env.ts                 # Typed environment variables
│
├── server/                        # Backend (if monorepo)
│   ├── src/
│   │   ├── index.ts               # Server entry
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── signals.routes.ts
│   │   │   ├── matches.routes.ts
│   │   │   ├── messages.routes.ts
│   │   │   ├── venues.routes.ts
│   │   │   ├── push.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── geo.middleware.ts
│   │   ├── services/
│   │   │   ├── geo.service.ts      # PostGIS queries
│   │   │   ├── match.service.ts    # Matching logic
│   │   │   ├── push.service.ts     # Web Push delivery
│   │   │   ├── socket.service.ts   # Socket.io logic
│   │   │   └── moderation.service.ts
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle ORM schema
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── utils/
│   │       ├── jwt.ts
│   │       └── validators.ts
│   └── package.json
│
├── .env.local                     # Environment variables (never commit)
├── .env.example                   # Example env file (commit this)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## PART 5: ALL SCREENS — COMPLETE SPECIFICATION

### 5.1 Screen Map

```
UNAUTHENTICATED FLOWS
├── /splash             SplashScreen
├── /onboarding         OnboardingWelcome → OnboardingHow → OnboardingPrivacy → OnboardingPermissions
├── /auth               AuthScreen (phone/Google)
└── /auth/verify        PhoneVerifyScreen (OTP)

PROFILE SETUP (post-auth, pre-home)
├── /setup/name         SetupName
├── /setup/photo        SetupPhoto
├── /setup/interests    SetupInterests
├── /setup/bio          SetupBio
└── /setup/done         SetupComplete

AUTHENTICATED CORE FLOWS
├── /home               HomeScreen (Main hub)
├── /discover           DiscoverScreen (Map)
├── /matches            MatchesScreen
├── /matches/:id        MatchDetailScreen + ChatWindow
├── /connections        ConnectionsScreen
├── /profile            ProfileScreen
├── /profile/edit       ProfileEditScreen
└── /settings
    ├── /settings           SettingsScreen
    ├── /settings/privacy   PrivacySettings
    ├── /settings/notifications NotificationSettings
    ├── /settings/blocked   BlockedUsersScreen
    ├── /settings/account   AccountSettings
    └── /settings/help      HelpScreen
```

### 5.2 Screen-by-Screen Specification

---

#### SCREEN: SplashScreen `/splash`

**Purpose:** App launch, auth check, animated brand moment
**Duration:** 1.5 seconds max
**Elements:**

- Full-screen gradient background (brand colors)
- Flick wordmark centered, animate in with spring scale
- Tagline: "Be here. Find people." fade in 300ms after logo
- Loading indicator (subtle, bottom of screen)
  **Logic:** Check JWT token → if valid → /home, if expired → /auth, first launch → /onboarding

---

#### SCREEN: OnboardingWelcome `/onboarding`

**Purpose:** Establish value proposition without mentioning loneliness
**Elements:**

- Full-bleed illustration: a bustling cafe with two people noticing each other (warm, inviting)
- H1: "The people you were meant to meet are already near you"
- Body: "Flick tells you when — so you don't have to wonder."
- Primary CTA: "Let's go"
- Secondary: "Skip" (top right)
  **Interactions:** Swipeable carousel between onboarding steps

---

#### SCREEN: OnboardingHow

**Purpose:** Explain the core mechanic (3 steps, visual)
**Step 1:** "Say you're here" — Illustration of phone with intent broadcast
**Step 2:** "Stay invisible until it's mutual" — Illustration of two signals crossing
**Step 3:** "90 minutes of magic" — Illustration of two people at a table
**Copy:** Zero mention of loneliness, friendship apps, or matching. Only framing: "spontaneous real-world moments"

---

#### SCREEN: OnboardingPrivacy

**Purpose:** Establish trust and safety as core product identity
**Elements:**

- Headline: "You're invisible until both say yes"
- Three trust statements with check icons:
  - "Nobody sees who you are until you both acknowledge each other"
  - "Signals vanish after 90 minutes. No permanent footprint."
  - "You'll never know who didn't respond. Only who did."
- CTA: "I like this"

---

#### SCREEN: OnboardingPermissions

**Purpose:** Request location + notifications (must explain WHY clearly)
**Location request:**

- Headline: "Flick only works if it can see where you are"
- Explanation: "We use your location to find people nearby — only while you're using the app"
- CTA: "Allow Location"
- If denied: Show educational screen with manual entry option fallback

**Notification request:**

- Headline: "Don't miss your 90 minutes"
- Explanation: "We'll tap you when someone matches with you"
- CTA: "Allow Notifications"
- If denied: Inform user they can enable later in Settings

---

#### SCREEN: AuthScreen `/auth`

**Purpose:** Phone OTP (primary) + Google (secondary) authentication
**Elements:**

- Headline: "Your number is your key"
- Country code picker (defaulting to +91 India) with flag emoji
- Phone number input — large, keyboard-optimized, instant formatting
- "Send OTP" primary button — becomes spinner while sending
- Divider: "or"
- Google Sign In button (prominent, not an afterthought)
- Footer: "By continuing, you agree to our Terms and Privacy Policy" (linked)
  **Validation:** Phone number format, country code required

---

#### SCREEN: PhoneVerifyScreen `/auth/verify`

**Purpose:** 6-digit OTP entry
**Elements:**

- "Code sent to +91 XXXXX XXXXX" (masked)
- 6 individual digit inputs — auto-advance on each digit input
- Auto-paste from SMS (Web OTP API where supported)
- Countdown timer: "Resend in 0:45"
- "Resend Code" (disabled until countdown complete)
- Back arrow to change number
  **UX:** Auto-submit when 6th digit entered. No need for "Verify" button.

---

#### SCREEN: SetupName `/setup/name`

**Purpose:** Display name — first impression moment
**Elements:**

- Headline: "What should people call you?"
- Single large text input, autofocused
- Character counter (max 50)
- Validation: no special chars except spaces and hyphens
- Progress indicator: Step 1 of 4
- "Continue" button (enabled when name ≥ 2 chars)

---

#### SCREEN: SetupPhoto `/setup/photo`

**Purpose:** Profile photo — trust signal
**Elements:**

- Large circular avatar placeholder with camera icon
- Tap to open: camera (primary), photo library (secondary)
- Built-in crop UI — circular crop only
- Skip option (available, but discouraged: "Profiles with photos get 4x more matches")
- Progress: 2 of 4

---

#### SCREEN: SetupInterests `/setup/interests`

**Purpose:** Build the interest graph (minimum 3 required)
**Elements:**

- Headline: "What's your vibe?"
- Grid of 40+ interest chips across categories:
  - Study: GATE, CAT, Coding, Design, Research, Writing
  - Social: Coffee, Food, Night walks, Music, Movies, Books
  - Activity: Running, Gym, Badminton, Chess, Yoga
  - Professional: Startup, AI, Finance, Marketing, Law
  - Creative: Art, Photography, Fashion, Gaming, Anime
  - Misc: Travel, Spirituality, Politics, Environment
- Multi-select — tap to toggle (springy press animation)
- Selected count shown: "3 selected (minimum reached)"
- "Add your own" — custom tag input
- Progress: 3 of 4

---

#### SCREEN: SetupBio `/setup/bio`

**Purpose:** One-line bio — optional but powerful
**Elements:**

- Headline: "One line about you. Or nothing."
- Large multiline input (character limit: 160)
- Placeholder: "Trying to read 50 books this year. Failing delightfully."
- Skip button prominent
- Progress: 4 of 4

---

#### SCREEN: SetupComplete `/setup/done`

**Purpose:** Celebrate setup completion — emotional hook
**Elements:**

- Full-screen animated confetti or particle burst (Framer Motion)
- Headline: "You're in."
- Subline: "Now go somewhere interesting."
- Single large CTA: "Open Flick"
  **Transition:** Spring animation into HomeScreen

---

#### SCREEN: HomeScreen `/home` ← PRIMARY SCREEN

**Purpose:** Command center — create signal, see nearby count, manage active signal
**Layout:**

- Top area: Location pill ("at IIT Delhi Main Gate" or "in Koramangala" — derived from reverse geocoding)
- Center: The BIG moment — if no active signal:
  - Large "I'm here" button — the hero element of the entire app
  - Surrounded by a subtle pulse ring animation
  - Below: "X people nearby and open right now" (live counter, updates via socket)
- Center: If active signal:
  - Signal card showing your current intent
  - Pulsing ring with live radius visualization
  - Timer: "Expires in 01:23:45"
  - Nearby count prominently displayed
  - Edit/Cancel signal options
- Bottom section: Quick insights (last 7 days stats, anonymous)

**Signal Composer (Bottom Sheet):**

- Triggered by "I'm here" button
- Intent input (natural language): "What brings you here?"
  - Quick suggestions: "Getting coffee ☕" / "Studying 📚" / "Just here 👋" / "Open to chat 💬"
  - Custom input field below
- Tag selector (from your profile interests, tap to add)
- Radius: toggle 500m / 1km / 2km
- Duration: toggle 60 / 90 / 120 min
- Big "Broadcast" button at bottom
- Privacy reminder: "Only people who also signal will see you"

---

#### SCREEN: DiscoverScreen `/discover`

**Purpose:** Map of physical space — warm spots, nearby activity
**Elements:**

- Full-screen Mapbox map centered on user location
- Venue markers showing "warm spots" (≥3 active signals) with pulsing rings
- Blue dot: user location
- Map tap on venue → venue detail card slides up from bottom:
  - Venue name, type, address
  - "X people signaling here right now"
  - "Check in to this venue" button (adds venue tag to your signal)
  - Walk/ride time estimate
- Top search bar: "Search by venue name or area"
- Filter chips: Coffee | Study | Food | Outdoor | All
- Bottom of map: horizontal scrollable list of nearby venues

---

#### SCREEN: MatchesScreen `/matches`

**Purpose:** All active and recent matches
**Layout:**

- Tabs: Active (window open) | Recent (last 7 days) | Connections (permanent)
- Each match card:
  - Avatar (shown only post-match)
  - Display name + shared interests count ("3 interests in common")
  - Active: remaining time countdown
  - Recent: "Window closed" + "Keep in touch?" prompt if not yet resolved
  - Last message preview if chat started
  - Unread message count badge
- Empty states:
  - Active: "No active matches. Drop a signal." with CTA
  - Recent: "Your matches from last week. Some may still connect."
  - Connections: "People you've chosen to stay in touch with."

---

#### SCREEN: MatchDetailScreen `/matches/:id`

**Purpose:** Full match view + chat interface
**Layout:**

- Top: Profile section — avatar, name, shared interests, mutual venue
- Timer bar: "Match window: 01:23:45 remaining" (color changes yellow < 30min, red < 10min)
- Chat area (full height, scrollable)
- Message input at bottom (sticky, above keyboard)
- Long-press on message → react with emoji
- "Keep in Touch" floating prompt (appears at 15 min remaining)

**Match Reveal Animation:**

- When a new match is created, show full-screen reveal animation
- Particle burst from center
- Avatar slides in from right
- "You matched!" with shared interests listed
- "Say hi" CTA pre-filled with a contextual opener based on shared intent

---

#### SCREEN: ConnectionsScreen `/connections`

**Purpose:** Long-term connections (mutual "keep in touch" from past matches)
**Elements:**

- List of permanent connections with avatars
- "Met at [venue/area] · [date]" context preserved
- "Message" button (opens new chat, not a match window — permanent chat)
- "Since [date]" indicator
- Empty state: "People you've chosen to stay connected with will appear here."

---

#### SCREEN: ProfileScreen `/profile`

**Purpose:** My profile + stats
**Elements:**

- Large avatar (tap to edit)
- Display name + bio
- Interest tags
- Stats: Signals sent | Matches made | Connections kept
- "Edit Profile" button
- Reputation score (if implemented)
- Link to Settings

---

#### SCREEN: SettingsScreen `/settings`

**Elements:**

- Account section: Edit Profile | Change Phone | Linked Accounts
- Privacy section: Profile Visibility | Location Settings | Blocked Users
- Notifications: Match alerts | Signal expiry | Connections
- Safety: Report a Problem | Community Guidelines | Safety Resources
- App: Language | App Version | Rate Flick | Share Flick
- Danger Zone: Pause Account | Delete Account

---

#### SCREEN: PrivacySettings `/settings/privacy`

**Full controls:**

- "Discoverable" master toggle (off = completely invisible)
- Show my interests on profile: toggle
- Allow venue check-in: toggle
- Data visibility radius: slider (500m / 1km / 2km / campus-only)
- "Delete all my signals and match history" — with confirmation dialog

---

## PART 6: DESIGN SYSTEM & UI/UX SPECIFICATION

### 6.1 Brand Identity

**Name:** Flick
**Logo concept:** A stylized "F" that contains a location pin + a ripple — representing both presence and signal
**Tagline:** "Be here. Find people."
**Brand voice:** Direct, warm, slightly playful. Never needy. Never preachy. Never mentions loneliness.

**Brand personality pillars:**

1. **Honest** — We don't fake data, we don't fake connection, we don't pretend the app is magic
2. **Warm** — The product cares about you making real connections
3. **Effortless** — Every interaction should feel like it required no effort
4. **Present** — The brand is rooted in right now, this moment, this place

### 6.2 Color System (OKLCH, 3-Tier Token Architecture)

```css
/* Primitive Tokens */
:root {
  --flick-amber-50: oklch(97% 0.02 85);
  --flick-amber-100: oklch(94% 0.05 85);
  --flick-amber-200: oklch(88% 0.1 85);
  --flick-amber-300: oklch(80% 0.15 78);
  --flick-amber-400: oklch(72% 0.18 72);
  --flick-amber-500: oklch(64% 0.2 68); /* Primary brand color */
  --flick-amber-600: oklch(55% 0.19 65);
  --flick-amber-700: oklch(45% 0.17 62);
  --flick-amber-800: oklch(35% 0.14 60);
  --flick-amber-900: oklch(25% 0.1 58);

  --flick-teal-50: oklch(97% 0.02 185);
  --flick-teal-100: oklch(93% 0.05 185);
  --flick-teal-400: oklch(68% 0.14 185);
  --flick-teal-500: oklch(60% 0.16 185); /* Secondary brand color */
  --flick-teal-600: oklch(52% 0.15 185);

  --flick-neutral-50: oklch(98% 0 0);
  --flick-neutral-100: oklch(96% 0 0);
  --flick-neutral-200: oklch(91% 0 0);
  --flick-neutral-300: oklch(84% 0 0);
  --flick-neutral-400: oklch(71% 0 0);
  --flick-neutral-500: oklch(58% 0 0);
  --flick-neutral-600: oklch(46% 0 0);
  --flick-neutral-700: oklch(38% 0 0);
  --flick-neutral-800: oklch(27% 0 0);
  --flick-neutral-900: oklch(18% 0 0);
  --flick-neutral-950: oklch(11% 0 0);
}

/* Semantic Tokens — Light Mode */
[data-theme="light"],
:root {
  --color-primary: var(--flick-amber-500);
  --color-primary-hover: var(--flick-amber-600);
  --color-primary-fg: oklch(100% 0 0);
  --color-secondary: var(--flick-teal-500);
  --color-secondary-hover: var(--flick-teal-600);
  --color-secondary-fg: oklch(100% 0 0);

  --color-background: var(--flick-neutral-50);
  --color-surface: oklch(100% 0 0);
  --color-surface-raised: var(--flick-neutral-100);
  --color-overlay: oklch(0% 0 0 / 0.5);

  --color-text-primary: var(--flick-neutral-900);
  --color-text-secondary: var(--flick-neutral-600);
  --color-text-muted: var(--flick-neutral-400);
  --color-text-inverse: oklch(100% 0 0);

  --color-border: var(--flick-neutral-200);
  --color-border-strong: var(--flick-neutral-300);

  --color-success: oklch(60% 0.18 145);
  --color-warning: oklch(72% 0.18 78);
  --color-error: oklch(60% 0.22 25);
  --color-info: oklch(60% 0.16 230);

  --color-signal-pulse: var(--flick-amber-400);
  --color-signal-ring: var(--flick-amber-200);
  --color-warm-spot: oklch(72% 0.15 45); /* warm orange for venues */
}

/* Semantic Tokens — Dark Mode */
[data-theme="dark"] {
  --color-background: var(--flick-neutral-950);
  --color-surface: var(--flick-neutral-900);
  --color-surface-raised: var(--flick-neutral-800);

  --color-text-primary: var(--flick-neutral-50);
  --color-text-secondary: var(--flick-neutral-300);
  --color-text-muted: var(--flick-neutral-500);

  --color-border: var(--flick-neutral-800);
  --color-border-strong: var(--flick-neutral-700);

  --color-primary: var(--flick-amber-400);
  --color-primary-hover: var(--flick-amber-300);
  --color-secondary: var(--flick-teal-400);
}
```

### 6.3 Typography

```css
/* Font: Inter (primary) — Google Fonts, variable font */
/* Font: Cal Sans (display) — for hero headings, feels warm and bold */

--font-display: "Cal Sans", "Inter", system-ui, sans-serif;
--font-body: "Inter", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", monospace;

/* Type Scale (matching 8px grid) */
--text-xs: 0.75rem; /* 12px — labels, captions */
--text-sm: 0.875rem; /* 14px — supporting text */
--text-base: 1rem; /* 16px — body text (never go below this for body) */
--text-lg: 1.125rem; /* 18px — card titles */
--text-xl: 1.25rem; /* 20px — section headings */
--text-2xl: 1.5rem; /* 24px — screen headings */
--text-3xl: 1.875rem; /* 30px — hero text */
--text-4xl: 2.25rem; /* 36px — display large */

/* Line Heights */
--leading-tight: 1.2;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0em;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
```

### 6.4 Spacing System (8px grid)

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
--space-20: 5rem; /* 80px */
--space-24: 6rem; /* 96px */
```

### 6.5 Border Radius

```css
--radius-sm: 0.25rem; /* 4px — small inputs, chips */
--radius-md: 0.5rem; /* 8px — cards, buttons */
--radius-lg: 0.75rem; /* 12px — modals, sheets */
--radius-xl: 1rem; /* 16px — large cards */
--radius-2xl: 1.5rem; /* 24px — hero elements */
--radius-full: 9999px; /* pills, avatars */
```

### 6.6 Shadows (Elevation System)

```css
--shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px oklch(0% 0 0 / 0.08), 0 2px 4px -2px oklch(0% 0 0 / 0.05);
--shadow-lg: 0 10px 15px -3px oklch(0% 0 0 / 0.08), 0 4px 6px -4px oklch(0% 0 0 / 0.05);
--shadow-xl: 0 20px 25px -5px oklch(0% 0 0 / 0.08), 0 8px 10px -6px oklch(0% 0 0 / 0.05);
--shadow-primary: 0 8px 24px oklch(var(--flick-amber-500) / 0.35);
```

### 6.7 Animation Principles

```css
/* Duration scale */
--duration-instant: 50ms; /* State changes (active, focus) */
--duration-fast: 150ms; /* Micro-interactions (button press) */
--duration-normal: 250ms; /* Component transitions */
--duration-slow: 350ms; /* Screen transitions */
--duration-slower: 500ms; /* Reveal animations */

/* Easing — cubic-bezier ONLY (never linear) */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Overshoot for delight */
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* Gentle deceleration */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Standard transition */
--ease-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1); /* Material-style */
```

**Critical animation rules:**

1. ONLY animate `transform` and `opacity` for performance — never `width`, `height`, `top`, `left`
2. Every animation must have a purpose — not decorative
3. Respect `prefers-reduced-motion` — all animations must have reduced-motion variants
4. Signal pulse ring: infinite CSS animation, `@keyframes pulse`, scale 1 → 1.5, opacity 1 → 0
5. Match reveal: spring scale from 0.8 → 1.0 + opacity 0 → 1

### 6.8 The Signal Pulse Component

This is the most important UI element in the entire app. Build it with care.

```jsx
// SignalPulse.tsx — The beating heart of Flick's identity
// Three concentric rings that pulse outward from a central dot
// Ring 1: 75% opacity, 300ms delay
// Ring 2: 50% opacity, 600ms delay
// Ring 3: 25% opacity, 900ms delay
// All rings: scale from 1.0 to 2.5, opacity from ring-specific to 0
// Duration: 2000ms, ease-out, infinite
// Color: --color-signal-pulse (amber/warm)
// Center dot: solid amber, 16px, with subtle glow shadow
```

### 6.9 Bottom Navigation

**Tabs (4):**

1. Home (house icon) — HomeScreen
2. Discover (map pin icon) — DiscoverScreen
3. Matches (lightning bolt icon) + unread badge — MatchesScreen
4. Profile (person icon) — ProfileScreen

**Rules:**

- Active tab: primary color fill icon + label
- Inactive tab: muted color icon only
- Tab height: 60px + safe area bottom
- Background: surface color with subtle top border
- Transition: spring scale 0.9 → 1.0 on tap

---

## PART 7: CORE FEATURES — COMPLETE SPECIFICATION

### 7.1 Feature 1: Signal Broadcasting

**What it does:** User broadcasts their presence and intent to nearby users in real time.

**How it works (technical):**

1. User taps "I'm here" → bottom sheet opens
2. User types intent (max 140 chars) + selects tags + sets radius/duration
3. On "Broadcast": POST /api/signals with location, intent, tags, radius, duration
4. Backend stores signal in PostgreSQL with PostGIS geography point
5. Backend publishes to Redis channel: `signals:nearby:{geohash}`
6. All connected users in that geo-bucket receive via Socket.io: `nearby_count_update`
7. Signal expires at `now + duration_minutes`
8. Cron job (every 5 min): marks expired signals as inactive

**Limitations/Rules:**

- One active signal per user at a time
- Intent passes OpenAI Moderation API before storage
- Signal location is the user's location at time of broadcast, not live-updated
- Users on Free tier: 5 signals per 30-day rolling period

### 7.2 Feature 2: Mutual Match Discovery

**What it does:** Surfaces that two people are nearby and open — but only to each other, simultaneously.

**How it works (technical):**

1. When User A creates a signal, backend queries for nearby signals:
   ```sql
   SELECT s.*, u.display_name, u.interests
   FROM signals s
   JOIN users u ON s.user_id = u.id
   WHERE ST_DWithin(s.location, $userLocation, $radius)
   AND s.is_active = true
   AND s.user_id != $userId
   AND s.expires_at > NOW()
   AND s.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $userId)
   ```
2. Backend returns COUNT only (not identities) to User A: "3 people nearby and open"
3. User A taps "Show me" → creates acknowledgment record
4. Backend checks: does any nearby signal owner ALSO have an acknowledgment toward User A?
5. IF mutual: create match record, emit `match_created` to both via Socket.io
6. IF not mutual: nothing shown — User A never knows who didn't respond

**The key design invariant:** `acknowledgments` table never exposed to users. Users only see matches (mutual acknowledgments).

### 7.3 Feature 3: 90-Minute Chat Window

**What it does:** Time-limited ephemeral chat between matched users.

**How it works:**

1. Match created with `window_expires_at = now() + 90 minutes`
2. Chat UI opens immediately on match reveal
3. Real-time messages via Socket.io room: `match:{matchId}`
4. At 15 min remaining: push notification + in-app timer turns yellow
5. At 10 min: timer turns red + "Keep in touch?" prompt appears
6. At 0: Socket.io emits `window_expired`, chat becomes read-only
7. Messages archived for 7 days (accessible in Recent tab), then hard-deleted

### 7.4 Feature 4: Warm Spots (Venue Layer)

**What it does:** Marks venues on the map where Flick activity is happening.

**How it works:**

1. Query: venues within 5km of user with ≥3 active signals in last 60 min
2. Displayed on map as pulsing warm-colored markers
3. Tap → venue card with signal count + "Check in" button
4. Check-in adds venue_id to user's active signal (if they have one)
5. This improves compatibility matching (two people at the same venue = higher match quality)

**Venue Business Model (B2B):**

- Free: Listed if signals naturally happen there (organic)
- Basic (₹2,000/month): Priority listing, "Flick Partner" badge, monthly analytics
- Premium (₹5,000/month): Push notifications to nearby users ("People are at [venue] right now"), featured on Discover map

### 7.5 Feature 5: Interest Graph (Passive)

**What it does:** Learns what kind of people you connect with best, improves match quality over time.

**How it works:**

1. Profile setup: user selects 3+ interest tags
2. Every signal created: tags are logged
3. Every match created: tags of both users are stored
4. Every "keep in touch" clicked: weighted signal of compatible interests
5. After 10+ signals: generate embedding (OpenAI text-embedding-3-small) of user's intent patterns
6. Future matches: ranked by cosine similarity of embeddings
7. Shown to user as: "Flick thinks you'd click with people into [tag], [tag], [tag]"

### 7.6 Feature 6: Reputation System

**What it does:** Builds trust in the network through behavior, not self-report.

**How it works:**

1. Every completed match: both users can rate "was this a positive experience?" (binary, not 1-5)
2. Positive: +0.1 reputation score
3. Report filed: -0.5 reputation score (pending review)
4. Report confirmed: -2.0 reputation score
5. Score below 3.0: shadow restrict (appear less in discovery, no notification)
6. Score below 1.0: automatic suspension (pending review)
7. Score shown on profile as: ●●●●○ (dots, not numbers — less gaming)

### 7.7 Feature 7: Safety Tools

**Non-negotiable, build these first:**

1. **Block:** Immediately removes user from all discovery, blocks future signals
2. **Report:** Categorized (inappropriate intent, harassment, inappropriate content, other) + description field → goes to admin queue
3. **Emergency contact:** Deep link to local emergency services
4. **Content moderation:** All intents run through OpenAI Moderation API before storage
5. **Profile photo review:** New photos flagged for admin review (async, 2-hour SLA)
6. **Rate limiting:** Max 1 signal per 15 minutes, max 5 acknowledgments per hour (per user)

### 7.8 Feature 8: Push Notifications

**Triggers and copy:**

| Event                 | Title                     | Body                                                | Action                 |
| --------------------- | ------------------------- | --------------------------------------------------- | ---------------------- |
| New match             | "You matched! ⚡"         | "{Name} is nearby and open. 90 minutes starts now." | Open MatchDetailScreen |
| Message received      | "{Name}"                  | "{message preview}"                                 | Open chat              |
| Window expiring       | "15 minutes left ⏱"       | "Your match window with {Name} is ending."          | Open chat              |
| Signal expiring       | "Your signal is expiring" | "Extend or let it go?"                              | Open HomeScreen        |
| Nearby activity spike | "People are gathering 📍" | "{venue} has {n} people signaling right now"        | Open DiscoverScreen    |

### 7.9 Feature 9: PWA Capabilities

**Full PWA requirements:**

```json
// manifest.json
{
  "name": "Flick",
  "short_name": "Flick",
  "description": "Be here. Find people.",
  "theme_color": "#d97706",
  "background_color": "#0a0a0a",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [...],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Home screen"
    }
  ],
  "shortcuts": [
    {
      "name": "Signal Now",
      "short_name": "Signal",
      "url": "/home?action=signal",
      "icons": [...]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": { "text": "intent" }
  }
}
```

**Service Worker cache strategies:**

- App shell (HTML, CSS, JS): Cache-first (offline capable)
- API responses: Network-first with stale-while-revalidate fallback
- User photos: Cache-first with 7-day expiry
- Map tiles: Cache-first with 30-day expiry
- Push notifications: Background sync when offline

---

## PART 8: SAAS PLAYBOOK — FLICK-SPECIFIC EXECUTION

### 8.1 Problem-Solution Fit (Verified)

The problem (collapse of physical social infrastructure) is validated by:

- WHO Commission on Social Connection (June 2025): 1 in 6 people globally affected
- OECD 2025: social infrastructure identified as policy-level gap
- Fortune March 2026: $406 billion market emerging around IRL experience
- VC investment in IRL consumer startups: up 25% 2023-2024

**The "hair on fire" test:** Urban 22-year-old who just moved to Bangalore for their first job. Zero existing social network. WhatsApp groups for work only. Instagram full of people from home city. Three months in, realizing they haven't had a real conversation outside of work in weeks. That person would download Flick and broadcast their first signal in under 2 minutes.

### 8.2 Monetization Strategy

**Free tier:** 5 signals per 30 days, basic matching, standard map

**Flick Plus — ₹199/month or ₹1,499/year:**

- Unlimited signals
- See your interest compatibility score with matches
- Custom signal radius
- "Cluster Replay" — heat map of when/where you tend to find people like you
- Priority in discovery algorithm

**Flick Pro — ₹499/month:**

- Everything in Plus
- Extend match window by 30 minutes (once per match)
- Signal scheduling (set a signal to auto-broadcast at a specific time/place)
- Advanced interest analytics

**Flick for Venues — B2B:**

- Basic: ₹2,000/month
- Premium: ₹5,000/month
- Enterprise: ₹15,000/month (for campuses, coworking chains)

**Revenue target milestones:**

- Month 3 (1,000 MAU): ₹0 — focus on PMF
- Month 6 (5,000 MAU): ₹50,000 MRR (10% conversion to ₹99 intro price)
- Month 12 (25,000 MAU): ₹300,000 MRR
- Month 18 (100,000 MAU): ₹1.5M MRR + venue B2B

### 8.3 Go-To-Market Strategy

**Phase 1 — Atomic Network (Month 0-3):**
Campus events at 3 colleges in Bangalore:

- Christ University (20,000+ students)
- BMS College of Engineering
- Indian Institute of Science (IISc) campus area

Launch event format (stolen from Tinder's USC playbook):

- Show up during fresher orientation week
- 30-minute demo event: "Everyone open Flick and tap I'm here — right now"
- Real-time screen showing signal count rise to 50, then mutual matches appearing
- That visual of magic happening in real time is the word-of-mouth loop

Target: 500 users on first campus in first weekend. 500 users in same place = critical density = genuine ambient value = genuine word-of-mouth.

**Phase 2 — Venue Partnerships (Month 3-6):**
Sign 10 cafes, coworking spaces, and campus hangouts in Bangalore as Flick Venue Partners (free at first, then paid).
The venue tag drives user discovery. Venue gets social cachet.
Use the signal density data to pitch venues: "Your cafe gets 14 Flick signals per week — that's 14 people broadcasting that they're open to meeting someone at your venue."

**Phase 3 — City Expansion (Month 6-12):**
City-by-city rollout: Bangalore → Delhi → Hyderabad → Pune → Mumbai
Same campus-first strategy in each city.
Hire 1 city operations person per city (not tech, people ops).

**Phase 4 — Platform (Month 12+):**
API for venues: Embed Flick signal count on their website/app
Enterprise for coworking chains: Flick-powered community layer
B2B for college campuses: Flick Campus Edition (white-labeled)

### 8.4 Key Metrics to Track (from Day 1)

| Metric             | Definition                              | Target (Month 6) |
| ------------------ | --------------------------------------- | ---------------- |
| MAU                | Monthly active users                    | 5,000            |
| Signal Rate        | % MAU who create ≥1 signal/week         | 40%              |
| Match Rate         | Signals that result in at least 1 match | 25%              |
| Chat Activation    | Matches with ≥3 messages exchanged      | 60%              |
| Window Completion  | Matches where chat extends to 60+ min   | 30%              |
| Keep In Touch Rate | Matches where both click KIT            | 15%              |
| D7 Retention       | Users active 7 days after signup        | 35%              |
| D30 Retention      | Users active 30 days after signup       | 20%              |
| NPS                | Net Promoter Score                      | ≥50              |
| Conversion         | Free → Paid                             | 5%               |

### 8.5 Customer Success & Onboarding

**The "aha moment":** User's first mutual match. This must happen within the first 3 signals. If a user sends 3 signals and never matches, they will not return. This is the activation problem to optimize obsessively.

**Onboarding emails:**

- Day 0: "Welcome to Flick — your first signal is waiting" (with location permission reminder)
- Day 1 (if no signal): "People are near you right now. Here's how to find them."
- Day 3 (if signal but no match): "Tip: signals at coffee shops match 3x more than signals at home"
- Day 7 (if match): "You matched with someone. How'd it go?" (NPS prompt)

### 8.6 Anti-Patterns to Avoid (from failed predecessors)

| Failed App | Mistake                                       | Flick's Solution                                        |
| ---------- | --------------------------------------------- | ------------------------------------------------------- |
| BumbleBFF  | Replicated dating app UI → transactional feel | Intent-first, activity-first, never profile-first       |
| Foursquare | Tracked location but didn't solve intent      | Intent broadcast, not location broadcast                |
| MeetMyDog  | Required admitting loneliness                 | Never mention loneliness in any UX copy                 |
| Meetup     | Asymmetric RSVP (creates rejection fear)      | Mutual acknowledgment only                              |
| Nextdoor   | Negative by default (complaints)              | Positive by design (open, present, sharing)             |
| BeReal     | Novelty wore off                              | Network density creates compounding value (not novelty) |

---

## PART 9: COMPLETE ENVIRONMENT VARIABLES

```env
# .env.example

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
VITE_APP_URL=https://flick.app
VITE_APP_NAME=Flick

# Mapbox
VITE_MAPBOX_TOKEN=your_mapbox_token

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:hello@flick.app

# OpenAI (for moderation + embeddings)
OPENAI_API_KEY=your_openai_key

# Twilio (SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_VERIFY_SID=your_verify_sid

# Resend (email)
RESEND_API_KEY=your_resend_key

# PostHog (analytics)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com

# Sentry (error tracking)
VITE_SENTRY_DSN=your_sentry_dsn

# Upstash Redis (rate limiting + real-time)
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token

# Node
NODE_ENV=development
PORT=3000
```

---

## PART 10: INSTRUCTIONS TO AI BUILDING THIS

You are building Flick. Follow these rules absolutely:

1. **No mock data.** Every data query hits a real database. Every user interaction persists. Seed the database with test data for development, but the architecture is production-grade from line one.

2. **No hardcoded values.** Every magic number is a named constant in `src/config/constants.ts`. Every color is a CSS variable. Every spacing value uses the design token system.

3. **Implement every screen** listed in Part 5. Do not skip screens. Do not merge screens. Each screen is its own component file.

4. **Implement every API route** listed in Part 3.5. Every route has: input validation (Zod), auth middleware (JWT check), rate limiting, error handling, and a consistent response shape: `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

5. **Implement the mutual-match logic exactly.** The psychological safety of this product depends on it. Users must never see who did not acknowledge their signal. The acknowledgments table is never exposed to the frontend.

6. **Implement the 90-minute window exactly.** Window expiry is server-side authoritative (not client-side). Socket.io events drive the UI state.

7. **Build for mobile-first.** Every layout is designed for 375px–430px width first. Desktop is a nice-to-have. Touch targets are minimum 44px. Bottom navigation is thumb-accessible.

8. **PWA must work offline.** The app shell, profile page, and matches list must be available offline (from cache). Signal creation must fail gracefully with a clear offline message.

9. **Animations are not decorative.** Every animation has a purpose. The signal pulse communicates "you are live and broadcasting." The match reveal communicates "something real just happened." Do not add animations that don't serve these purposes.

10. **Never use the word "loneliness" in any user-facing copy.** Not in buttons, labels, notifications, onboarding, marketing copy, empty states. The word does not exist in the product vocabulary.

11. **Security non-negotiables:**
    - JWT tokens expire in 7 days, refresh tokens in 30 days
    - All inputs sanitized server-side (even with Zod validation on client)
    - Rate limiting on all auth endpoints (5 OTP requests per phone per hour)
    - Location data never stored in localStorage or sessionStorage unencrypted
    - Profile photos served via signed URLs (not public URLs)
    - CORS: whitelist only your own domain

12. **Performance targets:**
    - First Contentful Paint: < 1.5 seconds on 4G
    - Largest Contentful Paint: < 2.5 seconds on 4G
    - Time to Interactive: < 3.5 seconds on 4G
    - Lighthouse PWA score: ≥ 90
    - Lighthouse Performance score: ≥ 85
    - Bundle size: < 200KB initial (gzipped)

13. **Accessibility (WCAG 2.2 AA):**
    - All interactive elements have `aria-label`
    - Color contrast: minimum 4.5:1 for normal text, 3:1 for large text
    - All inputs have associated `<label>` elements
    - Focus order follows visual order
    - All animations respect `prefers-reduced-motion`

14. **Start with this build order:**
    - Step 1: Database schema + Supabase setup
    - Step 2: Auth flow (phone OTP + Google) end-to-end
    - Step 3: User profile setup flow
    - Step 4: Signal creation + storage + expiry
    - Step 5: Geospatial query (nearby signals count)
    - Step 6: Mutual match logic (acknowledgments → match creation)
    - Step 7: Real-time via Socket.io (socket rooms per match)
    - Step 8: Chat (messages CRUD + real-time)
    - Step 9: HomeScreen + DiscoverScreen + MatchesScreen UI
    - Step 10: Push notifications
    - Step 11: PWA manifest + service worker
    - Step 12: All remaining screens (profile, settings, safety)
    - Step 13: Venue layer (B2B)
    - Step 14: Analytics integration (PostHog)
    - Step 15: Admin panel (basic moderation queue)

---

_End of Flick Build Prompt — Version 1.0_
_Built from: WHO Commission research, Cacioppo neuroscience, Putnam social capital theory, Fortune IRL economy data, SaaS Playbook 2026, UIUX Complete Reference, previous deep research synthesis_
_For: Adarsh — build this. Make it legendary._
