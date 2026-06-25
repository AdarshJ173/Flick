import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { LivePulse } from "@/components/flick/live-pulse";
import { MatchReveal } from "@/components/flick/match-reveal";
import { INTENTS, intentByKey, type Intent } from "@/lib/intents";
import { reverseGeocode, updateProfileLocation } from "@/lib/geocode";
import {
  MapPin,
  X,
  Clock,
  Sparkles,
  Users,
  Navigation,
  RefreshCw,
  Hand,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

type ActiveSignal = {
  id: string;
  intent: string;
  note: string | null;
  radius_m: number;
  place_label: string | null;
  expires_at: string;
};

type PendingReveal = {
  matchId: string;
  otherName: string;
  otherAvatar: string;
  sharedIntent: string;
};

type RecentMatch = {
  id: string;
  otherName: string;
  otherAvatar: string;
  sharedIntent: string;
  createdAt: string;
};

function HomePage() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent>(INTENTS[0]);
  const [note, setNote] = useState("");
  const [radius, setRadius] = useState(800);
  const [duration, setDuration] = useState(60);
  const [posting, setPosting] = useState(false);
  const [active, setActive] = useState<ActiveSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [reveal, setReveal] = useState<PendingReveal | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<{
    signals: number;
    matches: number;
    connections: number;
  } | null>(null);
  const locationFetched = useRef(false);

  const fetchNearbyCount = useCallback(async (p: { lat: number; lng: number }) => {
    try {
      const { data, error } = await supabase.rpc("count_nearby_signals", {
        in_lat: p.lat,
        in_lng: p.lng,
        in_search_radius_m: null,
      });
      if (!error && typeof data === "number") setNearbyCount(data);
    } catch {
      /* silent */
    }
  }, []);

  async function refreshLocation() {
    if (!pos) return;
    locationFetched.current = false;
    const label = await reverseGeocode(pos.lat, pos.lng);
    setLocationLabel(label);
    locationFetched.current = true;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        if (alive) setUid(u.user.id);
        const [{ data: activeSignal }, signalsRes, matchesRes, connRes, { data: recentMatches }] =
          await Promise.all([
            supabase
              .from("signals")
              .select("id,intent,note,radius_m,place_label,expires_at")
              .eq("user_id", u.user.id)
              .eq("active", true)
              .gt("expires_at", new Date().toISOString())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("signals")
              .select("id", { count: "exact", head: true })
              .eq("user_id", u.user.id),
            supabase
              .from("matches")
              .select("id", { count: "exact", head: true })
              .or(`user_a.eq.${u.user.id},user_b.eq.${u.user.id}`),
            (supabase as any)
              .from("connections")
              .select("id", { count: "exact", head: true })
              .or(`user_a.eq.${u.user.id},user_b.eq.${u.user.id}`),
            supabase
              .from("matches")
              .select("id,user_a,user_b,signal_id,created_at")
              .or(`user_a.eq.${u.user.id},user_b.eq.${u.user.id}`)
              .order("created_at", { ascending: false })
              .limit(3),
          ]);

        if (alive) {
          setActive(activeSignal ?? null);
          setStats({
            signals: signalsRes.count ?? 0,
            matches: matchesRes.count ?? 0,
            connections: connRes.count ?? 0,
          });
        }

        if (recentMatches && recentMatches.length > 0) {
          const otherIds = recentMatches.map((m) => (m.user_a === u.user.id ? m.user_b : m.user_a));
          const signalIds = recentMatches.map((m) => m.signal_id);
          const [{ data: profs }, { data: sigs }] = await Promise.all([
            supabase.from("profiles").select("id,display_name,avatar_emoji").in("id", otherIds),
            supabase.from("signals").select("id,intent").in("id", signalIds),
          ]);
          const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
          const sigMap = new Map((sigs ?? []).map((s) => [s.id, s.intent]));
          if (alive) {
            setRecents(
              recentMatches.map((m) => {
                const otherId = m.user_a === u.user.id ? m.user_b : m.user_a;
                const p = profMap.get(otherId);
                return {
                  id: m.id,
                  otherName: p?.display_name ?? "Someone",
                  otherAvatar: p?.avatar_emoji ?? "gradient-2",
                  sharedIntent: intentByKey(sigMap.get(m.signal_id) ?? "").label,
                  createdAt: m.created_at,
                };
              }),
            );
          }
        }
      } catch (err) {
        console.error("Error loading active signal:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      async (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(loc);
        fetchNearbyCount(loc);
        updateProfileLocation(loc.lat, loc.lng);
        if (!locationFetched.current) {
          locationFetched.current = true;
          const label = await reverseGeocode(loc.lat, loc.lng);
          setLocationLabel(label);
        }
      },
      () => {
        /* permission denied, silent on home */
      },
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [fetchNearbyCount]);

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel("home-matches-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_a=eq.${uid}` },
        async (payload) => {
          await handleNewMatch(
            payload.new as { id: string; user_a: string; user_b: string; signal_id: string },
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_b=eq.${uid}` },
        async (payload) => {
          await handleNewMatch(
            payload.new as { id: string; user_a: string; user_b: string; signal_id: string },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  useEffect(() => {
    if (!pos) return;
    const channel = supabase
      .channel("home-signals-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        fetchNearbyCount(pos);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pos, fetchNearbyCount]);

  useEffect(() => {
    if (!uid) return;
    (supabase as any)
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", uid)
      .then(({ error }: { error: { code?: string; message?: string } | null }) => {
        if (error && error.code === "42703") return;
        if (error) console.warn("[home] last_active_at update failed:", error.message);
      });
  }, [uid]);

  async function handleNewMatch(match: {
    id: string;
    user_a: string;
    user_b: string;
    signal_id: string;
  }) {
    const otherId = match.user_a === uid ? match.user_b : match.user_a;
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,avatar_emoji")
          .eq("id", otherId)
          .maybeSingle(),
        supabase.from("signals").select("intent").eq("id", match.signal_id).maybeSingle(),
      ]);
      setReveal({
        matchId: match.id,
        otherName: p?.display_name ?? "Someone",
        otherAvatar: p?.avatar_emoji ?? "gradient-2",
        sharedIntent: intentByKey(s?.intent ?? "").label,
      });
    } catch {
      toast.success("New match! Check your matches.", { duration: 4000 });
    }
  }

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function goLive() {
    setPosting(true);
    try {
      const p = await getPosition();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const expires_at = new Date(Date.now() + duration * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("signals")
        .insert({
          user_id: u.user.id,
          intent: intent.key,
          note: note.trim() || null,
          radius_m: radius,
          location: `POINT(${p.lng} ${p.lat})` as unknown,
          expires_at,
        })
        .select("id,intent,note,radius_m,place_label,expires_at")
        .single();
      if (error) throw error;
      setActive(data);
      fetchNearbyCount({ lat: p.lat, lng: p.lng });
      toast.success("You're live. People nearby can see your signal now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't go live");
    } finally {
      setPosting(false);
    }
  }

  async function endSignal() {
    if (!active) return;
    const { error } = await supabase.from("signals").update({ active: false }).eq("id", active.id);
    if (error) return toast.error(error.message);
    setActive(null);
    toast("Signal ended.");
  }

  if (loading)
    return (
      <AppShell>
        <LoadingShimmer />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
            <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
              Flick
            </span>
          </div>
          {locationLabel && (
            <button
              onClick={refreshLocation}
              className="no-tap flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-muted-foreground max-w-[55%] active:scale-95"
              aria-label="Refresh location"
            >
              <Navigation className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{locationLabel}</span>
              <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          )}
        </header>

        <h1 className="mt-5 font-display text-[clamp(2.5rem,9vw,3.5rem)] leading-[0.95] tracking-tight text-foreground">
          <span className="italic text-primary">Be here.</span>
          <br />
          <span className="text-muted-foreground/80 text-[0.6em] font-sans font-medium tracking-wide">
            Find people.
          </span>
        </h1>

        {nearbyCount !== null && !active && (
          <motion.button
            onClick={() => navigate({ to: "/nearby" })}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="no-tap mt-5 flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Users className="h-4 w-4 text-primary" />
                {nearbyCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warm text-[9px] font-bold text-warm-foreground">
                    {nearbyCount > 9 ? "9+" : nearbyCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground">
                  {nearbyCount === 0
                    ? "No one nearby yet"
                    : nearbyCount === 1
                      ? "1 person nearby and open"
                      : `${nearbyCount} people nearby and open`}
                </div>
                <div className="text-[11px] text-muted-foreground">within 2km · tap to see</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}

        {nearbyCount !== null && active && (
          <motion.button
            onClick={() => navigate({ to: "/nearby" })}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="no-tap mt-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary active:scale-95"
          >
            <Users className="h-3.5 w-3.5" />
            {nearbyCount === 0 ? "No one else nearby" : `${nearbyCount} people nearby too`}
            <span className="text-primary/60">→</span>
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          {active ? (
            <ActiveSignalCard
              key="active"
              signal={active}
              now={now}
              onEnd={endSignal}
              nearbyCount={nearbyCount}
              onOpenNearby={() => navigate({ to: "/nearby" })}
            />
          ) : (
            <ComposerCard
              key="composer"
              intent={intent}
              setIntent={setIntent}
              note={note}
              setNote={setNote}
              radius={radius}
              setRadius={setRadius}
              duration={duration}
              setDuration={setDuration}
              posting={posting}
              onGoLive={goLive}
            />
          )}
        </AnimatePresence>

        {recents.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Recent matches
              </h2>
              <button
                onClick={() => navigate({ to: "/matches" })}
                className="text-[11px] font-medium text-primary active:scale-95"
              >
                See all →
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {recents.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate({ to: "/match/$matchId", params: { matchId: r.id } })}
                    className="no-tap flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 text-left active:scale-[0.99]"
                  >
                    <FlickAvatar
                      emoji={r.otherAvatar}
                      name={r.otherName}
                      className="h-9 w-9 shrink-0 rounded-xl text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{r.otherName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.sharedIntent}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats && (
          <p className="mt-10 pb-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {stats.signals} signal{stats.signals === 1 ? "" : "s"} · {stats.matches} match
            {stats.matches === 1 ? "" : "es"} · {stats.connections} connection
            {stats.connections === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <MatchReveal
        visible={!!reveal}
        otherName={reveal?.otherName ?? ""}
        otherAvatar={reveal?.otherAvatar ?? "gradient-2"}
        sharedIntent={reveal?.sharedIntent ?? ""}
        onDismiss={() => {
          if (reveal) navigate({ to: "/match/$matchId", params: { matchId: reveal.matchId } });
          setReveal(null);
        }}
      />
    </AppShell>
  );
}

function ComposerCard(props: {
  intent: Intent;
  setIntent: (i: Intent) => void;
  note: string;
  setNote: (v: string) => void;
  radius: number;
  setRadius: (v: number) => void;
  duration: number;
  setDuration: (v: number) => void;
  posting: boolean;
  onGoLive: () => void;
}) {
  const {
    intent,
    setIntent,
    note,
    setNote,
    radius,
    setRadius,
    duration,
    setDuration,
    posting,
    onGoLive,
  } = props;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8"
    >
      <h2 className="font-display text-3xl leading-[0.95] tracking-tight text-balance">
        Right now, <span className="italic text-primary">I'm open to…</span>
      </h2>

      <div className="mt-6 -mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
         <div className="flex gap-2 pb-2">
           {INTENTS.map((it) => {
             const isActive = it.key === intent.key;
             return (
               <button
                 key={it.key}
                 onClick={() => {
                   haptics.light();
                   setIntent(it);
                 }}
                 className={cn(
                   "no-tap flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition active:scale-95 whitespace-nowrap",
                   isActive
                     ? "border-primary/40 bg-primary/15 text-primary"
                     : "border-border bg-surface text-foreground",
                 )}
               >
                 <it.icon className="h-4 w-4 shrink-0" /> {it.label}
               </button>
             );
           })}
         </div>
       </div>

       <textarea
         value={note}
         onChange={(e) => setNote(e.target.value.slice(0, 140))}
         placeholder={intent.prompt}
         rows={2}
         className="mt-5 w-full resize-none rounded-2xl border border-border bg-surface p-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
       <div className="mt-1 text-right text-[11px] text-muted-foreground">{note.length}/140</div>

       <div className="mt-4 grid grid-cols-2 gap-3">
         <SliderCard
           label="Radius"
           value={`${radius < 1000 ? radius + " m" : (radius / 1000).toFixed(1) + " km"}`}
           icon={<MapPin className="h-3.5 w-3.5" />}
         >
           <input
             type="range"
             min={200}
             max={3000}
             step={100}
             value={radius}
             onChange={(e) => {
               setRadius(+e.target.value);
               haptics.light();
             }}
             className="w-full accent-[var(--color-primary)]"
           />
         </SliderCard>
         <SliderCard label="For" value={`${duration} min`} icon={<Clock className="h-3.5 w-3.5" />}>
           <input
             type="range"
             min={15}
             max={180}
             step={15}
             value={duration}
             onChange={(e) => {
               setDuration(+e.target.value);
               haptics.light();
             }}
             className="w-full accent-[var(--color-primary)]"
           />
         </SliderCard>
       </div>

      <SlideButton onSwipe={onGoLive} disabled={posting} label="Flick it" />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        No one sees you unless they also said yes. Auto-disappears in {duration} min.
      </p>
    </motion.section>
  );
}

function SliderCard({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ActiveSignalCard({
  signal,
  now,
  onEnd,
  nearbyCount,
  onOpenNearby,
}: {
  signal: ActiveSignal;
  now: number;
  onEnd: () => void;
  nearbyCount: number | null;
  onOpenNearby: () => void;
}) {
  const intent = intentByKey(signal.intent);
  const expiresMs = new Date(signal.expires_at).getTime();
  const remainMs = Math.max(0, expiresMs - now);
  const mins = Math.floor(remainMs / 60000);
  const secs = Math.floor((remainMs % 60000) / 1000);
  const isUrgent = mins < 10;
  const isWarning = mins < 30;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8"
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-surface p-6 live-glow">
        <div className="pointer-events-none absolute -top-32 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-[80px]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary">
            <LivePulse size={8} /> You're live
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <intent.icon className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Open to
              </div>
              <h2 className="mt-1 font-display text-3xl leading-tight truncate">{intent.label}</h2>
            </div>
          </div>
          {signal.note && (
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/90 break-words">
              "{signal.note}"
            </p>
          )}
          <div
            className={cn(
              "mt-6 flex items-center justify-between rounded-2xl px-4 py-3 text-sm",
              isUrgent ? "bg-destructive/10" : isWarning ? "bg-warm/10" : "bg-background/40",
            )}
          >
            <span className="text-muted-foreground">Ends in</span>
            <span
              className={cn(
                "font-mono",
                isUrgent ? "text-destructive" : isWarning ? "text-warm" : "text-primary",
              )}
            >
              {mins}m {secs.toString().padStart(2, "0")}s
            </span>
          </div>
          {nearbyCount !== null && nearbyCount > 0 && (
            <button
              onClick={onOpenNearby}
              className="no-tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary active:scale-95"
            >
              <Hand className="h-4 w-4" /> {nearbyCount} people nearby · open matches
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onEnd}
        className="no-tap mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground active:scale-[0.98]"
      >
        <X className="h-4 w-4" /> End signal
      </button>
    </motion.section>
  );
}

function LoadingShimmer() {
  return (
    <div className="px-5 pt-12">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-4 h-11 w-full rounded-2xl bg-muted" />
      <div className="mt-8 h-12 w-2/3 rounded bg-muted" />
      <div className="mt-6 h-32 w-full rounded-2xl bg-muted" />
    </div>
  );
}

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location not supported on this device"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === 1 ? "Allow location access to go live" : "Couldn't read your location",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

function SlideButton({
  onSwipe,
  disabled,
  label = "Flick it",
}: {
  onSwipe: () => void;
  disabled: boolean;
  label?: string;
}) {
  const [slideX, setSlideX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handleSize = 52;
  const padding = 6;

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    startXRef.current = clientX - slideX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const maxSlide = containerWidth - handleSize - padding * 2;
    let newX = clientX - startXRef.current;
    if (newX < 0) newX = 0;
    if (newX > maxSlide) newX = maxSlide;
    setSlideX(newX);

    if (newX >= maxSlide * 0.95) {
      setIsDragging(false);
      setSlideX(maxSlide);
      haptics.flick();
      onSwipe();
      setTimeout(() => {
        setSlideX(0);
      }, 1500);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const maxSlide = containerWidth - handleSize - padding * 2;
      if (slideX < maxSlide * 0.95) {
        setSlideX(0);
      }
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, slideX]);

  const containerWidth = containerRef.current?.clientWidth || 300;
  const maxSlide = containerWidth - handleSize - padding * 2;
  const percent = maxSlide > 0 ? (slideX / maxSlide) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mt-7 flex h-16 w-full items-center rounded-2xl border bg-surface-2 overflow-hidden select-none",
        disabled
          ? "opacity-60 cursor-not-allowed border-border/40"
          : "border-border cursor-grab active:cursor-grabbing",
      )}
      style={{ padding: `${padding}px` }}
    >
      {/* Background slide indicator - color reveals as you drag */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-75 ease-out"
        style={{ width: `${percent}%` }}
      />

      {/* Premium Metallic Shine */}
      {!disabled && <div className="premium-shine" />}

      {/* Guide text inside the channel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            {disabled ? "Starting signal..." : label}
          </span>
          {!disabled && (
            <div className="flex items-center gap-0.5 ml-2.5 opacity-80">
              <span className="animate-[shimmer-arrows_1.4s_infinite_0s] text-primary font-bold text-sm tracking-tighter">
                &gt;
              </span>
              <span className="animate-[shimmer-arrows_1.4s_infinite_0.2s] text-primary font-bold text-sm tracking-tighter">
                &gt;
              </span>
              <span className="animate-[shimmer-arrows_1.4s_infinite_0.4s] text-primary font-bold text-sm tracking-tighter">
                &gt;
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Slide Handle (contains tlogo.svg) */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md cursor-pointer select-none",
          isDragging ? "transition-none" : "transition-all duration-200 ease-out",
        )}
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          transform: `translateX(${slideX}px)`,
        }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) handleStart(e.touches[0].clientX);
        }}
      >
        <img
          src="/tlogo.svg"
          className="h-7 w-7 object-contain brightness-0 filter opacity-85"
          alt="Flick Logo"
        />
      </div>
    </div>
  );
}
