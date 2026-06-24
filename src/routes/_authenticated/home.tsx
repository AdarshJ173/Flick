import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { LivePulse } from "@/components/flick/live-pulse";
import { INTENTS, intentByKey, type Intent } from "@/lib/intents";
import { MapPin, X, Clock, Sparkles } from "lucide-react";

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

function HomePage() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent>(INTENTS[0]);
  const [note, setNote] = useState("");
  const [radius, setRadius] = useState(800);
  const [duration, setDuration] = useState(60); // minutes
  const [posting, setPosting] = useState(false);
  const [active, setActive] = useState<ActiveSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Load active signal
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("signals")
        .select("id,intent,note,radius_m,place_label,expires_at")
        .eq("user_id", u.user.id)
        .eq("active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive) {
        setActive(data ?? null);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function goLive() {
    setPosting(true);
    try {
      const pos = await getPosition();
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
          location: `POINT(${pos.lng} ${pos.lat})` as any,
          expires_at,
        })
        .select("id,intent,note,radius_m,place_label,expires_at")
        .single();
      if (error) throw error;
      setActive(data);
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

  if (loading) return <AppShell><LoadingShimmer /></AppShell>;

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LivePulse size={9} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {active ? "You're live" : "Quiet"}
            </span>
          </div>
          <button
            onClick={() => navigate({ to: "/nearby" })}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
          >
            See who's around →
          </button>
        </header>

        <AnimatePresence mode="wait">
          {active ? (
            <ActiveSignalCard
              key="active"
              signal={active}
              now={now}
              onEnd={endSignal}
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
      </div>
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
  const { intent, setIntent, note, setNote, radius, setRadius, duration, setDuration, posting, onGoLive } = props;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8"
    >
      <h1 className="font-display text-5xl leading-[0.95] tracking-tight">
        Right now, <span className="italic text-primary">I'm open to…</span>
      </h1>

      <div className="mt-7 -mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <div className="flex gap-2 pb-2">
          {INTENTS.map((it) => {
            const active = it.key === intent.key;
            return (
              <button
                key={it.key}
                onClick={() => { setIntent(it); if (!note) setNote(""); }}
                className={`no-tap flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                <span className="text-base leading-none">{it.emoji}</span> {it.label}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 140))}
        placeholder={intent.prompt}
        rows={3}
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
            type="range" min={200} max={3000} step={100}
            value={radius} onChange={(e) => setRadius(+e.target.value)}
            className="w-full accent-[var(--color-primary)]"
          />
        </SliderCard>
        <SliderCard
          label="For"
          value={`${duration} min`}
          icon={<Clock className="h-3.5 w-3.5" />}
        >
          <input
            type="range" min={15} max={180} step={15}
            value={duration} onChange={(e) => setDuration(+e.target.value)}
            className="w-full accent-[var(--color-primary)]"
          />
        </SliderCard>
      </div>

      <button
        onClick={onGoLive}
        disabled={posting}
        className="no-tap mt-7 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60 live-glow"
      >
        {posting ? "Going live…" : <>Go live <Sparkles className="h-4 w-4" /></>}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        No one sees you unless they also said yes. Auto-disappears in {duration} min.
      </p>
    </motion.section>
  );
}

function SliderCard({ label, value, icon, children }: { label: string; value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ActiveSignalCard({ signal, now, onEnd }: { signal: ActiveSignal; now: number; onEnd: () => void }) {
  const intent = intentByKey(signal.intent);
  const expiresMs = new Date(signal.expires_at).getTime();
  const remainMs = Math.max(0, expiresMs - now);
  const mins = Math.floor(remainMs / 60000);
  const secs = Math.floor((remainMs % 60000) / 1000);
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-10"
    >
      <div className="glass live-glow relative overflow-hidden rounded-3xl p-7">
        <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-[80px]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary">
            <LivePulse size={8} /> You're live
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="text-5xl leading-none">{intent.emoji}</div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Open to</div>
              <h2 className="font-display mt-1 text-3xl leading-tight">{intent.label}</h2>
            </div>
          </div>
          {signal.note && (
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">"{signal.note}"</p>
          )}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-background/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Ends in</span>
            <span className="font-mono text-primary">{mins}m {secs.toString().padStart(2, "0")}s</span>
          </div>
        </div>
      </div>

      <button
        onClick={onEnd}
        className="no-tap mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground transition active:scale-[0.98]"
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
      (err) => reject(new Error(err.code === 1 ? "Allow location access to go live" : "Couldn't read your location")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}
