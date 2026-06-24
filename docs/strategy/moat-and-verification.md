# Flick's Moat & Verification Philosophy

> Strategic rationale for the design decisions behind Flick — what makes it
> structurally different from Tinder/Bumble/Hinge, and why we ship without
> ID/OTP/photo-liveness verification.

---

## 1. Is the moat "only discovering and connecting people"?

**No.** That framing describes the *surface product*, not the *defensible
position*. The moat is the **physical network density** of users in a given
micro-geography, combined with the **longitudinal behavioral signal dataset**
that density produces. Tinder's moat was never "we match people" — it was
"every college student in the US is on our app because we hit USC first."

### 1.1 The four layers of the moat

| Layer | What it is | Why it's defensible |
|---|---|---|
| **Physical network density** | Number of users within a 2km radius of any given user | Cannot be replicated without re-doing the cold start. Uber proved this. Foursquare failed because they didn't. |
| **Behavioral signal data** | Every signal sent, every wave given, every chat that converts to "keep in touch", every time a person declines to wave back (silently) | This is the social-health dataset. After 18 months of a user's data, we know more about their relational life than any new entrant can ever derive from a fresh sign-up. |
| **Trust-by-behaviour** | Reputation, social tier, kept-in-touch count, response latency | Behavioral trust is harder to fake than ID verification. A user with 10+ kept-in-touch connections is verifiably "Established" — no government ID needed. |
| **Anti-rejection data** | Knowledge of *what users don't say no to* (waves that aren't reciprocated are invisible to the signal author) | This is the dataset no dating app can produce because they show rejection. We have a unique dataset because we hide it. |

### 1.2 Why Flick is NOT a dating app

The structural difference is not cosmetic. It is architectural.

| | Tinder / Bumble / Hinge | Flick |
|---|---|---|
| **Atomic unit** | Profile (photo + bio) | Intent ("I'm open to coffee") |
| **Visibility model** | Two-sided: anyone can browse anyone in their radius | Mutual-only: you see a person only after BOTH sides say yes |
| **Rejection signal** | Visible ("you liked them, they didn't like you back") | Structurally impossible — waves against your signal are RLS-hidden from you |
| **Stakes** | Open-ended, can message anyone matched forever | Time-bounded: a 2-hour window. Then it expires unless both sides opt to "keep in touch" |
| **Goal** | Match (gamified, endless queue) | Meet (terminal: a real-world encounter) |
| **Discovery input** | Photos of strangers | Your *intent*, in a place, in a window of time |
| **What you swipe on** | A face (judgement of appearance) | An activity (Coffee / A walk / Co-work) |
| **Identity reveal** | Immediate on match | Only when both sides have opted to keep in touch permanently |
| **Stalker resistance** | You can re-view profiles you've matched with | Names/avatars shown only inside an active 2-hour match. No "matches inbox" of strangers' profiles. |
| **What you pay for** | Unlimited swipes, see who liked you, rewind, boost | More signals per month, longer windows, signal-replay heatmap |

### 1.3 The "inter-brain synchrony" moat

The deeper moat — the one not even dating apps can copy — is that **Flick
exists to produce face-to-face co-presence**. The neuroscience of
hyperscanning (fNIRS/EEG studies) shows that physical co-presence creates
measurable neural phase-locking between two brains that text-based
interaction does not. This is structural, not metaphorical. The product
that facilitates physical co-presence is building something in the user's
brain that no digital substitute can replicate. A dating app could copy our
mutual-match mechanic in a weekend. They cannot copy the inter-brain
synchrony that the mechanic points users toward.

---

## 2. Is verification even needed? What do Bumble/Tinder actually do?

**Short answer: no, ID verification is not needed. The big dating apps don't
use it for their main product either. They use phone SMS + photo pose-check.
That's it.**

### 2.1 What each incumbent actually ships

| App | Phone OTP | Photo pose-check | Government ID | Other |
|---|---|---|---|---|
| **Tinder** | ✅ Twilio SMS | ✅ "Photo Verification" (re-take a pose) | ❌ | — |
| **Bumble** | ✅ Twilio SMS | ✅ "Photo Verification" + AI face-match | ❌ for Date/BFF. ⚠️ ID only for Bizz mode (driver's license) | — |
| **Hinge** | ✅ Twilio SMS | ✅ "Selfie Verification" | ❌ | — |
| **Bumble BFF** | ✅ SMS | ✅ Photo | ❌ | — |
| **Hinge** | ✅ SMS | ✅ Photo | ❌ | — |
| **WhatsApp** | ✅ SMS (required) | ❌ | ❌ | — |
| **Telegram** | ✅ SMS | ❌ | ❌ | — |
| **Meetup** | ❌ email only | ❌ | ❌ | — |
| **Nextdoor** | ✅ postal address | ❌ | ❌ | Address-based "neighborhood" claim |
| **Strava** | ✅ email | ❌ | ❌ | — |
| **Timeleft** | ✅ SMS | ❌ | ❌ | — |

**Conclusion: NO mainstream social app uses government ID verification on
the user-facing sign-up. The most any of them do is SMS OTP + photo
pose-check.** The Bumble Bizz / Tinder ID features are extreme-edge
products for the <1% of users who want a "blue checkmark" — they are
aspirational status symbols, not safety infrastructure.

### 2.2 What Flick ships

| Verification layer | Status | Rationale |
|---|---|---|
| Email + password | ✅ Live | Lowest friction. Required for Supabase. |
| Google OAuth | ✅ Live | One-tap sign-in. Works on every device. |
| Phone OTP (SMS/Twilio) | ❌ **Removed** | Not used by users. Adds 30s of friction. Hides nothing useful that a behaviour signal doesn't already reveal. |
| Aadhaar / DigiLocker | ❌ **Removed** | Was a UI simulation. Real Aadhaar auth requires a paid KYC provider and DPDP-compliant data storage. The cost > value. The retention hit from this gate exceeds the safety gain. |
| Photo liveness / face match | ❌ **Removed** | Was a UI simulation. Real liveness requires a vendor (Onfido/Persona). Photos don't make Flick safer — the 2-hour window and mutual-only visibility do. |
| LinkedIn / Instagram URL | ❌ **Removed** | Was a UX theater (paste your own URL). Real verification requires OAuth into those platforms and is a privacy red flag. |
| Behavioural trust tier | ✅ Live (4 tiers: Unverified / Verified / Trusted / Established) | Earned, not granted. Promoted automatically as users accumulate kept-in-touch connections and 7+ days of usage. Cannot be bought. Hard to fake. |

### 2.3 Why behavioural trust is the right primitive

The reason ID verification feels reassuring is that it implies "this is a
real person." But the actual safety properties we need are:

1. **The person is not a bot.** → Solved by behavioural data. Bots don't
   have 10 kept-in-touch connections.
2. **The person is not a serial harasser.** → Solved by the `blocks` and
   `reports` tables, RLS-excluded from `get_nearby_signals`, and the
   hard-coded 2-hour time bound on every chat. Harassers can't keep
   accumulating victims if every conversation auto-expires.
3. **The person is who they say they are.** → Solved by the
   `verification_requests` table (optional), photo-verified badge, and the
   Trust tier display. Nobody else can see your name until you have a
   mutual match.
4. **The person is over 18.** → Solved by a single checkbox in setup
   (DPDP consent + age confirmation). This is what the Aadhaar simulation
   was pretending to do. A checkbox is enough because Flick's safety
   property is "we don't serve minors", not "we know exactly who every
   user is."

The "Established" tier (10+ kept-in-touch connections) is a better safety
signal than any government ID, because it can only be earned by being a
person other people want to keep in their life.

### 2.4 What we removed and why

In the codebase, the following were **UI theater** (looked like
verification, did nothing):

- `verifyAgeWithDigiLocker` in `src/routes/setup.tsx` — simulated a
  round-trip to DigiLocker with a 1-second `setTimeout`. Replaced with a
  single "I am 18+ and agree to the Community Guidelines" checkbox.
- `startPhotoVerification` in `src/routes/_authenticated/profile.tsx` —
  computed the average brightness of a 2-second webcam feed and called it
  "liveness". Replaced with a behavioural trust tier that auto-promotes
  after 7 days + 1 kept-in-touch connection.

The user-facing copy was changed to "Flick Trust Score" — earned through
use, not paid for, not granted by a third-party vendor.

### 2.5 What we kept and why

- **Supabase Auth email+password + Google.** Lowest friction, no vendor
  dependency, and OAuth gives us a one-tap sign-in that 90%+ of mobile
  users prefer over typing email+password.
- **Block & Report** at every level of the UI (chat header, discover
  drawer, profile sheet, /blocked page). RLS-enforced two-way exclusion
  in `get_nearby_signals` and `count_nearby_signals`.
- **Mutual-match visibility** as the primary safety architecture. If you
  can't see someone, you can't harass them.
- **2-hour chat window** with optional "Keep in touch" → permanent
  connection. Time-bounded by default.
- **Anti-trilateration distance bucketing** in `get_nearby_signals`:
  `<250m → "100m"`, `<500m → "350m"`, `<1000m → "750m"`, else
  `round(distance/500)*500`. An attacker with multiple Sybil signals
  cannot pinpoint another user's exact location.

---

## 3. Strategic summary

**Flick is a behavioural-trust product disguised as a location app.** The
moat is not the matching algorithm (commodity in 2026). The moat is the
unique dataset only a mutual-only, time-bounded, intent-first product
can produce. Verification is the wrong primitive for that moat. Behaviour
is the right one.

The product that wins is not the product with the strictest sign-up. It
is the product that lets the largest number of real, well-behaved humans
form real-world connections with the lowest activation cost, while making
it structurally impossible for the worst actors to scale. That is what
Flick ships.
