import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { intentByKey } from "@/lib/intents";
import { Hand, Radar, MapPin, CheckCircle2 } from "lucide-react";
import { LivePulse } from "@/components/flick/live-pulse";
import { FlickAvatar } from "@/components/flick/avatar";
import { cn } from "@/lib/utils";
import { ChatProfileSheet, type ChatProfileUser } from "@/components/flick/chat-profile-sheet";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/_authenticated/nearby")({
  component: NearbyPage,
});

type NearbySignal = {
  id: string;
  user_id: string;
  intent: string;
  note: string | null;
  place_label: string | null;
  distance_m: number;
  expires_at: string;
  created_at: string;
  is_mine: boolean;
  already_waved: boolean;
  display_name: string;
  avatar_emoji: string;
  vibe: string | null;
  photo_verified: boolean;
  age_verified: boolean;
};

function NearbyPage() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [signals, setSignals] = useState<NearbySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ChatProfileUser | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const fetchSignals = useCallback(async (p: { lat: number; lng: number }) => {
    const { data, error } = await supabase.rpc("get_nearby_signals", {
      in_lat: p.lat,
      in_lng: p.lng,
      in_search_radius_m: null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data as Array<Record<string, unknown>>) ?? [];
    if (list.length === 0) {
      setSignals([]);
      return;
    }
    const userIds = list.map((s) => s.user_id as string).filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_emoji,vibe,photo_verified,age_verified")
      .in("id", userIds);

    const enriched: NearbySignal[] = list.map((s) => {
      const profile = (profiles ?? []).find((p) => p.id === s.user_id) ?? {};
      return {
        id: s.id as string,
        user_id: (s.user_id as string) ?? "",
        intent: s.intent as string,
        note: (s.note as string | null) ?? null,
        place_label: (s.place_label as string | null) ?? null,
        distance_m: (s.distance_m as number) ?? 0,
        expires_at: s.expires_at as string,
        created_at: s.created_at as string,
        is_mine: !!s.is_mine,
        already_waved: !!s.already_waved,
        display_name: (profile.display_name as string) ?? "Someone",
        avatar_emoji: (profile.avatar_emoji as string) ?? "gradient-2",
        vibe: (profile.vibe as string | null) ?? null,
        photo_verified: !!(profile.photo_verified as boolean | undefined),
        age_verified: !!(profile.age_verified as boolean | undefined),
      };
    });
    const uniqueMap = new Map<string, NearbySignal>();
    enriched.forEach((item) => {
      const existing = uniqueMap.get(item.user_id);
      if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
        uniqueMap.set(item.user_id, item);
      }
    });
    setSignals(Array.from(uniqueMap.values()));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUid(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionError("Location not supported on this device");
      setLoading(false);
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      async (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(loc);
        await fetchSignals(loc);
        setLoading(false);
      },
      () => {
        setPermissionError("Allow location to see who's nearby");
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [fetchSignals]);

  useEffect(() => {
    if (!pos) return;
    const channel = supabase
      .channel("signals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        fetchSignals(pos);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pos, fetchSignals]);

  async function wave(signal: NearbySignal) {
    if (signal.is_mine || signal.already_waved) return;
    const { data, error } = await supabase.rpc("wave_on_signal", { in_signal_id: signal.id });
    if (error) {
      haptics.error();
      return toast.error(error.message);
    }
    haptics.success();
    setSignals((arr) => arr.map((s) => (s.id === signal.id ? { ...s, already_waved: true } : s)));
    toast.success("It's mutual. Go say hi.", { duration: 3500 });
    if (data) navigate({ to: "/match/$matchId", params: { matchId: data as string } });
  }

  function openProfile(signal: NearbySignal) {
    haptics.light();
    setSelectedProfile({
      id: signal.user_id,
      display_name: signal.display_name,
      avatar_emoji: signal.avatar_emoji,
      vibe: signal.vibe,
      interests: null,
      photo_verified: signal.photo_verified,
      age_verified: signal.age_verified,
      place_label: signal.place_label,
    });
    setProfileOpen(true);
  }

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <header className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
              <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
                Flick
              </span>
              <div className="flex items-center gap-1.5 ml-1 rounded-full bg-surface-2 border border-border px-2 py-0.5">
                <Radar className="h-3 w-3 text-primary animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Nearby
                </span>
              </div>
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              Within <span className="italic text-primary">reach</span>.
            </h1>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {signals.filter((s) => !s.is_mine).length} signal
            {signals.filter((s) => !s.is_mine).length === 1 ? "" : "s"}
          </span>
        </header>

        {permissionError ? (
          <EmptyState title="Location off" body={permissionError} />
        ) : loading ? (
          <ShimmerList />
        ) : signals.filter((s) => !s.is_mine).length === 0 ? (
          <EmptyState
            title="It's quiet around here."
            body="No one nearby has flicked yet. Try going live — others will see you and might join."
          />
        ) : (
          <ul className="mt-8 space-y-3">
            <AnimatePresence initial={false}>
              {signals
                .filter((s) => !s.is_mine)
                .map((s, i) => (
                  <SignalCard
                    key={s.id}
                    signal={s}
                    index={i}
                    onWave={() => wave(s)}
                    onOpenProfile={() => openProfile(s)}
                  />
                ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ChatProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={selectedProfile}
        intent={selectedProfile ? null : null}
        matchId=""
        currentUserId={uid ?? ""}
        onBlocked={() => setProfileOpen(false)}
      />
    </AppShell>
  );
}

function SignalCard({
  signal,
  index,
  onWave,
  onOpenProfile,
}: {
  signal: NearbySignal;
  index: number;
  onWave: () => void;
  onOpenProfile: () => void;
}) {
  const intent = intentByKey(signal.intent);
  const distLabel =
    signal.distance_m < 250
      ? "< 250m"
      : signal.distance_m < 500
        ? "250–500m"
        : signal.distance_m < 1000
          ? "500m–1km"
          : "1–2km";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-border bg-surface"
    >
      <button
        onClick={onOpenProfile}
        className="no-tap block w-full px-5 pt-5 pb-3 text-left"
        aria-label={`View ${signal.display_name}'s profile`}
      >
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <FlickAvatar
              emoji={signal.avatar_emoji}
              name={signal.display_name}
              className={cn(
                "h-12 w-12 rounded-2xl text-lg shadow-sm",
                signal.photo_verified ? "live-glow" : "",
              )}
            />
            <LivePulse size={6} className="absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-semibold leading-tight text-foreground">
                {signal.display_name}
              </h3>
              {signal.photo_verified && (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-primary"
                  aria-label="Photo verified"
                />
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
              {signal.vibe || `Open to ${intent.label.toLowerCase()}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <intent.icon className="h-3.5 w-3.5" />
              <span>{intent.label}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <MapPin className="h-3 w-3" /> {distLabel}
            </div>
          </div>
        </div>
        {signal.note && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-foreground/85">
            "{signal.note}"
          </p>
        )}
      </button>

      <div className="px-5 pb-4">
        <button
          onClick={onWave}
          disabled={signal.already_waved}
          className={cn(
            "no-tap flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]",
            signal.already_waved
              ? "bg-warm/15 text-warm border border-warm/30"
              : "bg-primary text-primary-foreground",
          )}
        >
          <Hand className={cn("h-4 w-4", signal.already_waved ? "" : "rotate-12")} />
          {signal.already_waved ? "You waved" : "Wave"}
        </button>
      </div>
    </motion.li>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
        <Radar className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="font-display mt-6 text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function ShimmerList() {
  return (
    <ul className="mt-8 space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-32 animate-pulse rounded-3xl border border-border bg-surface" />
      ))}
    </ul>
  );
}
