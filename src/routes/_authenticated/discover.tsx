import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/flick/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { intentByKey } from "@/lib/intents";
import { Compass, MapPin, Flame, Users, Hand } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverPage,
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

// Returns a stable, deterministic angle in radians based on UUID
function getAngleFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 360) * (Math.PI / 180);
}

function DiscoverPage() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [signals, setSignals] = useState<NearbySignal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<NearbySignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [waving, setWaving] = useState(false);

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
    const list = (data as NearbySignal[]) ?? [];
    setSignals(list);
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
        setPermissionError(null);
        await fetchSignals(loc);
        setLoading(false);
      },
      () => {
        setPermissionError("Allow location permissions to view the Radar");
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [fetchSignals]);

  // Realtime update listener
  useEffect(() => {
    if (!pos) return;
    const channel = supabase
      .channel("discover-signals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        fetchSignals(pos);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pos, fetchSignals]);

  async function handleWave(signal: NearbySignal) {
    if (signal.is_mine || signal.already_waved) return;
    setWaving(true);
    try {
      const { data, error } = await supabase.rpc("wave_on_signal", { in_signal_id: signal.id });
      if (error) throw error;
      
      // Update UI state
      setSignals((arr) => arr.map((s) => (s.id === signal.id ? { ...s, already_waved: true } : s)));
      if (selectedSignal?.id === signal.id) {
        setSelectedSignal((prev) => prev ? { ...prev, already_waved: true } : null);
      }
      
      toast.success("Wave sent. If it's mutual, you'll match instantly!", { duration: 3500 });
      if (data) {
        navigate({ to: "/match/$matchId", params: { matchId: data as string } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send wave");
    } finally {
      setWaving(false);
    }
  }

  // Count active signals nearby (excluding current user's)
  const activeCount = signals.filter((s) => !s.is_mine).length;

  return (
    <AppShell>
      <div className="px-5 pt-12 flex flex-col min-h-[calc(100vh-100px)]">
        <header className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "12s" }} />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Radar
              </span>
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              Live <span className="italic text-primary">signals</span>.
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-surface-2 border border-border px-3 py-1 rounded-full text-xs text-muted-foreground font-mono">
            <Flame className="h-3.5 w-3.5 text-warm animate-pulse" />
            <span>{activeCount} active</span>
          </div>
        </header>

        {permissionError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface mb-6 border border-border">
              <MapPin className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl">Location Off</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">{permissionError}</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Compass className="h-10 w-10 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            {/* Ambient High-Contrast Radar Map Grid Visualizer */}
            <div className="relative mt-8 aspect-square w-full rounded-[36px] bg-surface-2 border border-border/40 overflow-hidden flex items-center justify-center">
              {/* Radar Circles */}
              <div className="absolute h-[85%] w-[85%] rounded-full border border-border/10" />
              <div className="absolute h-[60%] w-[60%] rounded-full border border-border/10" />
              <div className="absolute h-[35%] w-[35%] rounded-full border border-border/10" />

              {/* Cross lines */}
              <div className="absolute h-full w-[1px] bg-border/5" />
              <div className="absolute w-full h-[1px] bg-border/5" />

              {/* Glowing user position center */}
              <div className="absolute z-10 flex h-6 w-6 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-primary/20 opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-primary shadow-lg shadow-primary" />
              </div>

              {/* Radar Sweep Line */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute top-1/2 left-1/2 w-1/2 h-[1px] bg-gradient-to-r from-primary/30 to-transparent origin-left"
                style={{ transformOrigin: "0 0" }}
              />

              {/* Hotspot Markers mapped using distance ratios */}
              {signals
                .filter((s) => !s.is_mine)
                .map((spot) => {
                  const angle = getAngleFromId(spot.id);
                  // Calculate radius ratio (max search radius is 2000m)
                  const radiusRatio = Math.min(1.0, spot.distance_m / 2000);
                  const latOffset = Math.sin(angle) * radiusRatio;
                  const lngOffset = Math.cos(angle) * radiusRatio;

                  return (
                    <button
                      key={spot.id}
                      onClick={() => setSelectedSignal(spot)}
                      className="absolute z-20 group transition duration-300"
                      style={{
                        top: `${50 + latOffset * 40}%`,
                        left: `${50 + lngOffset * 40}%`,
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-8 w-8 rounded-full bg-warm/20 animate-pulse-ring" />
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-xl text-xs transition duration-200 border",
                            selectedSignal?.id === spot.id
                              ? "bg-warm text-warm-foreground border-warm scale-110 shadow-lg"
                              : "bg-surface border-border text-foreground hover:scale-105"
                          )}
                        >
                          {(() => {
                            const intentObj = intentByKey(spot.intent);
                            return <intentObj.icon className="h-4.5 w-4.5" />;
                          })()}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Selected Venue Bottom Drawer Details */}
            <div className="mt-auto pt-6 min-h-36">
              <AnimatePresence mode="wait">
                {selectedSignal ? (
                  <motion.div
                    key={selectedSignal.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-3xl border border-border bg-surface p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-2xl leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                          Open to {intentByKey(selectedSignal.intent).label.toLowerCase()}
                        </h3>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {selectedSignal.distance_m < 100
                              ? "very close to you"
                              : `${Math.round(selectedSignal.distance_m / 10) * 10}m away`}
                          </span>
                        </div>
                        {selectedSignal.note && (
                          <p className="mt-3 text-sm text-foreground/80 italic line-clamp-2">
                            "{selectedSignal.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWave(selectedSignal)}
                        disabled={selectedSignal.already_waved || waving}
                        className={cn(
                          "no-tap flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-[0.98]",
                          selectedSignal.already_waved
                            ? "bg-warm/15 text-warm border border-warm/30"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        <Hand className={cn("h-4 w-4 shrink-0", selectedSignal.already_waved ? "" : "rotate-12")} />
                        {selectedSignal.already_waved ? "Waved" : "Wave Back"}
                      </button>
                      <button
                        onClick={() => setSelectedSignal(null)}
                        className="no-tap h-12 w-12 flex items-center justify-center rounded-2xl border border-border bg-surface text-muted-foreground transition active:scale-[0.98] font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-activity"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-3xl border border-border/40 bg-surface-2/30 p-5 text-center flex flex-col items-center justify-center py-8"
                  >
                    <Users className="h-6 w-6 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Tap a signal on the radar grid</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">See distances, vibe tags, and send waves instantly.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
