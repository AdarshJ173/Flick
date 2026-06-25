import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/flick/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { intentByKey } from "@/lib/intents";
import { Compass, MapPin, Users, Hand } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { haptics } from "@/lib/haptics";
import { updateProfileLocation } from "@/lib/geocode";

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

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "coffee", label: "Coffee" },
  { key: "work", label: "Study" },
  { key: "food", label: "Food" },
  { key: "walk", label: "Walk" },
  { key: "talk", label: "Chat" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

function DiscoverPage() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [signals, setSignals] = useState<NearbySignal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<NearbySignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [waving, setWaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const fetchSignals = useCallback(async (p: { lat: number; lng: number }) => {
    const { data: signalsData, error: signalsError } = await supabase.rpc("get_nearby_signals", {
      in_lat: p.lat,
      in_lng: p.lng,
      in_search_radius_m: null,
    });
    if (signalsError) {
      toast.error(signalsError.message);
      return;
    }
    const list = ((signalsData as NearbySignal[]) ?? []).filter(s => s.intent !== null && s.intent !== undefined);

    // Fetch related profile details to display Trust info
    if (list.length > 0) {
      const userIds = list.map((s) => s.user_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_emoji, vibe, photo_verified, linkedin_url, instagram_url, website_url, age_verified")
        .in("id", userIds);

      const enriched = list.map((s) => {
        const profile = profiles?.find((p) => p.id === s.user_id) as any;
        let score = 25;
        if (profile) {
          if (profile.age_verified) score += 15;
          if (profile.photo_verified) score += 25;
          if (profile.linkedin_url) score += 15;
          if (profile.instagram_url) score += 15;
          if (profile.website_url) score += 5;
        }
        return {
          ...s,
          user_id: s.user_id,
          display_name: profile?.display_name || "Someone",
          avatar_emoji: profile?.avatar_emoji || "gradient-2",
          trustScore: score,
          photo_verified: !!profile?.photo_verified,
          linkedin_url: profile?.linkedin_url,
          instagram_url: profile?.instagram_url,
          website_url: profile?.website_url,
        };
      });
      const uniqueMap = new Map<string, any>();
      enriched.forEach((item) => {
        const existing = uniqueMap.get(item.user_id);
        if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
          uniqueMap.set(item.user_id, item);
        }
      });
      setSignals(Array.from(uniqueMap.values()));
    } else {
      setSignals([]);
    }
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
        updateProfileLocation(loc.lat, loc.lng);
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

      haptics.success();

      // Update UI state
      setSignals((arr) => arr.map((s) => (s.id === signal.id ? { ...s, already_waved: true } : s)));
      if (selectedSignal?.id === signal.id) {
        setSelectedSignal((prev) => (prev ? { ...prev, already_waved: true } : null));
      }

      toast.success("Wave sent. If it's mutual, you'll match instantly!", { duration: 3500 });
      if (data) {
        navigate({ to: "/match/$matchId", params: { matchId: data as string } });
      }
    } catch (err) {
      haptics.error();
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
              <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
              <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
                Flick
              </span>
              <div className="flex items-center gap-1.5 ml-1 rounded-full bg-surface-2 border border-border px-2 py-0.5">
                <Compass
                  className="h-3 w-3 text-primary animate-spin"
                  style={{ animationDuration: "12s" }}
                />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Radar
                </span>
              </div>
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              Live <span className="italic text-primary">signals</span>.
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-surface-2 border border-border px-3 py-1 rounded-full text-xs text-muted-foreground font-mono">
            <img
              src="/activedot.svg"
              className="h-3.5 w-3.5 object-contain animate-pulse"
              alt="Active"
            />
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
            {/* High-Contrast Radar Map Grid Visualizer - Uncontained, centered & fully responsive */}
            <div className="flex-1 flex items-center justify-center py-2">
              <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
                <div className="radar-loader relative w-full h-full rounded-full border border-border/25 flex items-center justify-center">
                  {/* Centered Ambient Radial Glow (static, true glow) */}
                  <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,248,62,0.22)_0%,rgba(203,248,62,0.06)_35%,transparent_70%)] pointer-events-none animate-pulse"
                    style={{ animationDuration: "4s" }}
                  />

                  {/* Concentric dashed circles */}
                  <div className="absolute inset-[16%] rounded-full border border-dashed border-border/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />
                  <div className="absolute inset-[32%] rounded-full border border-dashed border-border/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />
                  <div className="absolute inset-[48%] rounded-full border border-dashed border-border/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />
                  <div className="absolute inset-[64%] rounded-full border border-dashed border-border/15 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />
                  <div className="absolute inset-[80%] rounded-full border border-dashed border-border/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />

                  {/* Cross lines (axes) */}
                  <div className="absolute h-full w-[1px] bg-border/5 pointer-events-none" />
                  <div className="absolute w-full h-[1px] bg-border/5 pointer-events-none" />

                  {/* Center dot position - glowing center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-6 w-6 items-center justify-center pointer-events-none">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-primary/20 opacity-75" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-primary shadow-lg shadow-primary" />
                  </div>

                  {/* Sweeper Hand with electric lime sweep line */}
                  <div className="radar-sweep absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[1.5px] border-t border-dashed border-primary" />
                  </div>

                  {/* Hotspot Markers mapped using distance ratios */}
                  {signals
                    .filter((s) => !s.is_mine)
                    .map((spot) => {
                      const angle = getAngleFromId(spot.id);
                      // Calculate radius ratio (max search radius is 2000m)
                      const radiusRatio = Math.min(1.0, spot.distance_m / 2000);
                      // Multiply by 42 to make sure they fit comfortably inside the circle boundary
                      const latOffset = Math.sin(angle) * radiusRatio;
                      const lngOffset = Math.cos(angle) * radiusRatio;

                      return (
                        <button
                          key={spot.id}
                          onClick={() => {
                            haptics.light();
                            setSelectedSignal(spot);
                          }}
                          className="absolute z-20 group transition duration-300"
                          style={{
                            top: `${50 + latOffset * 42}%`,
                            left: `${50 + lngOffset * 42}%`,
                          }}
                        >
                          <div className="relative flex items-center justify-center">
                            <span className="absolute h-8 w-8 rounded-full bg-warm/20 animate-pulse-ring" />
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-xl text-xs transition duration-200 border",
                                selectedSignal?.id === spot.id
                                  ? "bg-warm text-warm-foreground border-warm scale-110 shadow-lg"
                                  : "bg-surface border-border text-foreground hover:scale-105",
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
              </div>
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
                    <div className="flex items-start gap-3">
                      <FlickAvatar
                        emoji={(selectedSignal as any).avatar_emoji || "gradient-2"}
                        name={(selectedSignal as any).display_name || "Someone"}
                        className={cn(
                          "h-14 w-14 shrink-0 rounded-2xl text-lg shadow-sm",
                          (selectedSignal as any).photo_verified ? "live-glow" : "",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display truncate text-2xl leading-none">
                            {(selectedSignal as any).display_name || "Someone"}
                          </h3>
                          {/* Trust Badge Tier representation */}
                          {(() => {
                            const score = (selectedSignal as any).trustScore || 25;
                            const getBadgeClass = (s: number) => {
                              if (s < 40)
                                return "bg-muted text-muted-foreground border-muted-foreground/20";
                              if (s < 60) return "bg-primary/20 text-primary border-primary/20";
                              if (s < 80)
                                return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
                              return "bg-amber-500/20 text-amber-400 border-amber-500/20";
                            };
                            const getBadgeLabel = (s: number) => {
                              if (s < 40) return "Unverified";
                              if (s < 60) return "Verified";
                              if (s < 80) return "Trusted";
                              return "Established";
                            };
                            return (
                              <span
                                className={cn(
                                  "text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0",
                                  getBadgeClass(score),
                                )}
                              >
                                {getBadgeLabel(score)}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {(() => {
                            const intentObj = intentByKey(selectedSignal.intent);
                            return <intentObj.icon className="h-3.5 w-3.5 shrink-0" />;
                          })()}
                          <span className="truncate">
                            Open to {intentByKey(selectedSignal.intent).label.toLowerCase()}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {selectedSignal.distance_m < 250
                              ? "< 250m away"
                              : selectedSignal.distance_m < 500
                                ? "250m - 500m away"
                                : selectedSignal.distance_m < 1000
                                  ? "500m - 1km away"
                                  : "1km - 2km away"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedSignal.note && (
                      <p className="text-sm text-foreground/85 italic line-clamp-2">
                        "{selectedSignal.note}"
                      </p>
                    )}

                    {/* Social verifications panel */}
                    <div className="rounded-xl bg-surface-2 p-3 space-y-2 text-xs">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold block">
                        Identity & Verifications
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded border text-[10px]",
                            (selectedSignal as any).photo_verified
                              ? "text-primary border-primary/20 bg-primary/10"
                              : "text-muted-foreground border-border",
                          )}
                        >
                          {(selectedSignal as any).photo_verified
                            ? "✓ Liveness Passed"
                            : "✗ Face Unverified"}
                        </span>
                        {[
                          (selectedSignal as any).linkedin_url && "LinkedIn",
                          (selectedSignal as any).instagram_url && "Instagram",
                          (selectedSignal as any).website_url && "Website",
                        ]
                          .filter(Boolean)
                          .map((plat) => (
                            <span
                              key={plat}
                              className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px]"
                            >
                              ✓ {plat}
                            </span>
                          ))}
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
                            : "bg-primary text-primary-foreground",
                        )}
                      >
                        <Hand
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedSignal.already_waved ? "" : "rotate-12",
                          )}
                        />
                        {selectedSignal.already_waved ? "Waved" : "Wave Back"}
                      </button>

                      {/* 1-Click Report / Block Button */}
                      <button
                        onClick={async () => {
                          const conf = window.confirm(
                            "Report profile for safety review and block them?",
                          );
                          if (!conf) return;
                          try {
                            const { error: blockErr } = await supabase.rpc("block_user", {
                              in_blocked_id: (selectedSignal as any).user_id,
                            });
                            if (blockErr) throw blockErr;
                            const {
                              data: { user },
                            } = await supabase.auth.getUser();
                            if (!user) throw new Error("User not authenticated");
                            await supabase.from("reports").insert({
                              reporter_id: user.id,
                              reported_id: (selectedSignal as any).user_id,
                              reason: "Inappropriate profile / safety concern",
                            });
                            toast.success("Profile blocked and reported.");
                            setSelectedSignal(null);
                            fetchSignals(pos!);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Reporting failed");
                          }
                        }}
                        className="no-tap h-12 px-3 flex items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive transition active:scale-[0.98] text-xs font-semibold"
                      >
                        Block & Report
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Tap a signal on the radar grid
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      See distances, vibe tags, and send waves instantly.
                    </p>
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
