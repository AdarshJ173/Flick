import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { intentByKey } from "@/lib/intents";
import { Hand, Radar, MapPin } from "lucide-react";
import { LivePulse } from "@/components/flick/live-pulse";

export const Route = createFileRoute("/_authenticated/nearby")({
  component: NearbyPage,
});

type NearbySignal = {
  id: string;
  intent: string;
  note: string | null;
  place_label: string | null;
  distance_m: number;
  expires_at: string;
  created_at: string;
  is_mine: boolean;
  already_waved: boolean;
};

function NearbyPage() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [signals, setSignals] = useState<NearbySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fetchSignals = useCallback(async (p: { lat: number; lng: number }) => {
    const { data, error } = await supabase.rpc("get_nearby_signals", {
      in_lat: p.lat,
      in_lng: p.lng,
      in_search_radius_m: 2000,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSignals((data as NearbySignal[]) ?? []);
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

  // Realtime: refetch on any signals change
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
    if (error) return toast.error(error.message);
    setSignals((arr) => arr.map((s) => (s.id === signal.id ? { ...s, already_waved: true } : s)));
    toast.success("It's mutual. Go say hi.", { duration: 3500 });
    if (data) navigate({ to: "/match/$matchId", params: { matchId: data as string } });
  }

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Nearby
              </span>
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              Within reach.
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
                  <SignalCard key={s.id} signal={s} index={i} onWave={() => wave(s)} />
                ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function SignalCard({
  signal,
  index,
  onWave,
}: {
  signal: NearbySignal;
  index: number;
  onWave: () => void;
}) {
  const intent = intentByKey(signal.intent);
  const distLabel =
    signal.distance_m < 80
      ? "right next to you"
      : signal.distance_m < 1000
        ? `${Math.round(signal.distance_m / 10) * 10}m away`
        : `${(signal.distance_m / 1000).toFixed(1)}km away`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <intent.icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{intent.label}</h3>
            <LivePulse size={6} />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <MapPin className="h-3 w-3 shrink-0" /> {distLabel}
          </div>
          {signal.note && (
            <p className="mt-2.5 text-[14px] leading-relaxed text-foreground/90 line-clamp-3">
              "{signal.note}"
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onWave}
        disabled={signal.already_waved}
        className={`no-tap mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
          signal.already_waved
            ? "bg-warm/15 text-warm border border-warm/30"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <Hand className={`h-4 w-4 ${signal.already_waved ? "" : "rotate-12"}`} />
        {signal.already_waved ? "You waved" : "Wave"}
      </button>
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
