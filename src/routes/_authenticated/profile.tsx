import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import {
  LogOut,
  Check,
  Settings,
  Radio,
  Handshake,
  Users,
  Sparkles,
  ChevronRight,
  BadgeCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { AvatarPicker } from "@/components/flick/avatar-picker";
import {
  DEFAULT_DICEBEAR_STYLE,
  dicebearUrl,
  isDicebearUrl,
  type DicebearStyle,
} from "@/lib/avatars";

const EMOJI_CHOICES = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "gradient-6",
];

const INTEREST_OPTIONS = [
  "GATE",
  "CAT",
  "Coding",
  "Design",
  "Research",
  "Writing",
  "Coffee",
  "Food",
  "Night walks",
  "Music",
  "Movies",
  "Books",
  "Running",
  "Gym",
  "Badminton",
  "Chess",
  "Yoga",
  "Startup",
  "AI",
  "Finance",
  "Marketing",
  "Law",
  "Art",
  "Photography",
  "Fashion",
  "Gaming",
  "Anime",
  "Travel",
  "Spirituality",
  "Politics",
  "Environment",
];

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

type ProfileStats = {
  signalsCount: number;
  matchesCount: number;
  connectionsCount: number;
};

function ProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("gradient-2");
  const [tempEmoji, setTempEmoji] = useState("gradient-2");
  const [vibe, setVibe] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [showInterestEditor, setShowInterestEditor] = useState(false);
  const [isPlusActive, setIsPlusActive] = useState(false);

  const [ageVerified, setAgeVerified] = useState(false);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [showIdentitySubpage, setShowIdentitySubpage] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [debouncers, setDebouncers] = useState<Record<string, any>>({});

  const autoSaveField = (fieldName: string, value: string) => {
    if (debouncers[fieldName]) {
      clearTimeout(debouncers[fieldName]);
    }
    const timer = setTimeout(async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase
        .from("profiles")
        .update({
          [fieldName]: value.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", u.user.id);
    }, 450);
    setDebouncers(prev => ({ ...prev, [fieldName]: timer }));
  };

  useEffect(() => {
    setIsPlusActive(localStorage.getItem("flick_plus_active") === "true");

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const uid = u.user.id;

      const [{ data: p }, signalRes, matchRes, connRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,avatar_emoji,vibe,interests,age_verified,created_at")
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("signals").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .or(`user_a.eq.${uid},user_b.eq.${uid}`),
        (supabase as any)
          .from("connections")
          .select("id", { count: "exact", head: true })
          .or(`user_a.eq.${uid},user_b.eq.${uid}`),
      ]);

      if (p) {
        setName(p.display_name);
        if (p.avatar_emoji && isDicebearUrl(p.avatar_emoji)) {
          setEmoji(p.avatar_emoji);
          setTempEmoji(p.avatar_emoji);
        } else {
          const def = p.avatar_emoji || dicebearUrl(p.display_name || "flick");
          setEmoji(def);
          setTempEmoji(def);
        }
        setVibe(p.vibe ?? "");
        setInterests((p as any).interests ?? []);
        setAgeVerified(!!(p as any).age_verified);
        const created = (p as any).created_at ? new Date((p as any).created_at) : new Date();
        const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        setAccountAgeDays(Number.isFinite(days) ? days : 0);
      }
      setStats({
        signalsCount: signalRes.count ?? 0,
        matchesCount: matchRes.count ?? 0,
        connectionsCount: connRes.count ?? 0,
      });
    })();
  }, []);

  const toggleInterest = async (val: string) => {
    const updated = interests.includes(val) ? interests.filter((i) => i !== val) : [...interests, val];
    setInterests(updated);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("profiles")
      .update({
        interests: updated,
        updated_at: new Date().toISOString()
      })
      .eq("id", u.user.id);
  };

  // Trust tier is behaviour-based, not identity-based. No camera, no ID.
  // - New: account age < 7 days OR 0 connections
  // - Trusted: 7+ days AND 1+ connection
  // - Established: 30+ days AND 5+ connections
  const trustTier: { label: string; color: string; reason: string } = (() => {
    const conns = stats?.connectionsCount ?? 0;
    if (accountAgeDays >= 30 && conns >= 5) {
      return {
        label: "Established",
        color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        reason: `${accountAgeDays} days on Flick · ${conns} connections`,
      };
    }
    if (accountAgeDays >= 7 && conns >= 1) {
      return {
        label: "Trusted",
        color: "bg-primary/20 text-primary border-primary/30",
        reason: `${accountAgeDays} days on Flick · ${conns} connection${conns === 1 ? "" : "s"}`,
      };
    }
    return {
      label: "New",
      color: "bg-muted text-muted-foreground border-muted-foreground/30",
      reason:
        accountAgeDays === 0
          ? "Just getting started"
          : `${accountAgeDays} day${accountAgeDays === 1 ? "" : "s"} on Flick`,
    };
  })();

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || "Someone",
        avatar_emoji: emoji,
        vibe: vibe.trim() || null,
        interests,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved.");
    setShowInterestEditor(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-6">
        <Sheet open={showIdentitySubpage} onOpenChange={setShowIdentitySubpage}>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl border-t border-border bg-background p-0"
          >
            <div className="px-6 pb-8 pt-2">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
              <SheetHeader className="items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <SheetTitle className="mt-3 font-display text-2xl">
                  How Flick trust works
                </SheetTitle>
                <SheetDescription>
                  We don't ask for ID, selfies, or social links. Your tier is earned by how you use
                  Flick.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-3">
                {[
                  {
                    label: "New",
                    color: "bg-muted text-muted-foreground",
                    reason: "Just signed up. Nothing to prove — go flick.",
                  },
                  {
                    label: "Trusted",
                    color: "bg-primary/20 text-primary",
                    reason: "7+ days on Flick and at least 1 kept-in-touch connection.",
                  },
                  {
                    label: "Established",
                    color: "bg-amber-500/20 text-amber-400",
                    reason: "30+ days and 5+ kept-in-touch connections. The OG tier.",
                  },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5"
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        t.color,
                      )}
                    >
                      {t.label}
                    </span>
                    <p className="text-xs leading-relaxed text-muted-foreground">{t.reason}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-[10px] text-muted-foreground/70">
                You're currently <span className="text-foreground">{trustTier.label}</span>. Keep
                meeting people to level up.
              </p>
            </div>
          </SheetContent>
        </Sheet>

        <header className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
              <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
                Flick
              </span>
              <div className="flex items-center gap-1.5 ml-1 rounded-full bg-surface-2 border border-border px-2 py-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Profile
                </span>
              </div>
              {isPlusActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary animate-pulse">
                  <Sparkles className="h-2.5 w-2.5 fill-primary/30" /> Plus Member
                </span>
              )}
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              The you <span className="italic text-primary">people see</span>.
            </h1>
          </div>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="no-tap -m-2 rounded-full p-2 text-muted-foreground hover:text-foreground active:scale-90"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>
        <p className="mt-2 text-sm text-muted-foreground">
          Only revealed to people you both said yes to.
        </p>

        <div className="mt-8 flex items-center gap-5">
          <button
            onClick={() => {
              setTempEmoji(emoji);
              setShowAvatarEditor(true);
            }}
            className="no-tap shrink-0 h-16 w-16 rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95 transition-transform border border-white/10"
            title="Tap to change avatar"
          >
            <FlickAvatar
              emoji={emoji}
              name={name}
              className="h-full w-full rounded-[inherit] text-xl shadow-sm"
            />
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            <input
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                autoSaveField("display_name", val);
              }}
              placeholder="Your Name"
              className="font-display text-2xl font-bold bg-transparent border-none focus:outline-none px-0 py-0 text-foreground placeholder:text-muted-foreground/60 w-full"
            />
            <input
              value={vibe}
              onChange={(e) => {
                const val = e.target.value;
                setVibe(val);
                autoSaveField("vibe", val);
              }}
              placeholder="Your vibe (one line)"
              className="text-xs bg-transparent border-none focus:outline-none px-0 py-0 text-muted-foreground placeholder:text-muted-foreground/50 w-full"
            />
            <div className="text-[10px] text-muted-foreground/70 truncate pt-0.5">
              {email}
            </div>
          </div>
        </div>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6 grid grid-cols-3 gap-2"
          >
            <StatCard
              icon={<Radio className="h-4 w-4 text-primary" />}
              label="Signals"
              value={stats.signalsCount}
            />
            <StatCard
              icon={<Handshake className="h-4 w-4 text-warm" />}
              label="Matches"
              value={stats.matchesCount}
            />
            <StatCard
              icon={<Users className="h-4 w-4 text-primary/70" />}
              label="Connections"
              value={stats.connectionsCount}
            />
          </motion.div>
        )}

        <motion.button
          onClick={() => setShowIdentitySubpage(true)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="no-tap mt-4 flex w-full items-center justify-between rounded-3xl border border-primary/20 bg-primary/5 p-5 text-left active:scale-[0.98] transition-all"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                Flick Trust
              </span>
              <span className="text-[10px] text-muted-foreground">{trustTier.reason}</span>
            </div>
            <p className="font-display text-xl tracking-tight text-foreground">
              Earned through <span className="italic text-primary">vibe, not paperwork</span>.
            </p>
          </div>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-full border tracking-wide uppercase font-mono",
              trustTier.color,
            )}
          >
            {trustTier.label}
          </span>
        </motion.button>

        {/* Premium Upgrade Subscription Banner */}
        <motion.button
          onClick={() => navigate({ to: "/subscription" })}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={cn(
            "no-tap mt-3 flex w-full items-center justify-between rounded-3xl border p-5 text-left active:scale-[0.98] transition-all",
            isPlusActive
              ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
              : "border-primary/30 bg-gradient-to-r from-primary/10 to-transparent hover:border-primary/50",
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                Flick Plus
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isPlusActive ? "Your subscription is active" : "Go beyond the limits"}
              </span>
            </div>
            <p className="font-display text-lg tracking-tight text-foreground">
              {isPlusActive ? (
                <>
                  Manage your <span className="italic text-primary">Plus features</span>
                </>
              ) : (
                <>
                  Unlock <span className="italic text-primary">Unlimited Signals</span>
                </>
              )}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </motion.button>



        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Interests
            </span>
            <button
              onClick={() => setShowInterestEditor(!showInterestEditor)}
              className="text-[11px] text-primary font-medium"
            >
              {showInterestEditor ? "Done editing" : "Edit"}
            </button>
          </div>
          {!showInterestEditor ? (
            <div className="flex flex-wrap gap-2">
              {interests.length === 0 ? (
                <button
                  onClick={() => setShowInterestEditor(true)}
                  className="text-sm text-muted-foreground/60 border border-dashed border-border rounded-xl px-3 py-1.5"
                >
                  + Add interests
                </button>
              ) : (
                interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-xl border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1 [scrollbar-width:none]">
              {INTEREST_OPTIONS.map((interest) => {
                const active = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`no-tap px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95 ${
                      active
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-surface border-border text-muted-foreground"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={signOut}
          className="no-tap mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <Sheet open={showAvatarEditor} onOpenChange={setShowAvatarEditor}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border bg-background p-0 max-h-[90vh] overflow-y-auto"
        >
          <div className="px-6 pb-8 pt-2">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader className="items-center text-center">
              <SheetTitle className="font-display text-2xl">
                Change your <span className="italic text-primary">avatar</span>
              </SheetTitle>
              <SheetDescription>Pick a style. Shuffle until it feels like you.</SheetDescription>
            </SheetHeader>
            <div className="mt-5">
              <AvatarPicker
                initialUrl={isDicebearUrl(tempEmoji) ? tempEmoji : null}
                name={name}
                onChange={(url) => setTempEmoji(url)}
              />
              <button
                onClick={async () => {
                  const { data: u } = await supabase.auth.getUser();
                  if (!u.user) {
                    toast.error("Not signed in.");
                    return;
                  }
                  const { error } = await supabase
                    .from("profiles")
                    .update({ avatar_emoji: tempEmoji, updated_at: new Date().toISOString() })
                    .eq("id", u.user.id);
                  if (error) {
                    toast.error("Couldn't save avatar. Try again.");
                    return;
                  }
                  setEmoji(tempEmoji);
                  toast.success("Avatar updated");
                  setShowAvatarEditor(false);
                }}
                className="no-tap mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98]"
              >
                <Check className="h-4 w-4" strokeWidth={2.4} />
                Save avatar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3">
      {icon}
      <span className="font-display text-2xl leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
    </label>
  );
}
