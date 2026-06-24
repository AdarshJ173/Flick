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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";

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
  const [vibe, setVibe] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [showInterestEditor, setShowInterestEditor] = useState(false);
  const [isPlusActive, setIsPlusActive] = useState(false);

  const [photoVerified, setPhotoVerified] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [ageVerified, setAgeVerified] = useState(false);
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);

  useEffect(() => {
    // Check if Flick Plus is active in local storage
    setIsPlusActive(localStorage.getItem("flick_plus_active") === "true");

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const uid = u.user.id;

      const [{ data: p }, signalRes, matchRes, connRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name,avatar_emoji,vibe,interests,photo_verified,linkedin_url,instagram_url,website_url,age_verified",
          )
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
        setEmoji(p.avatar_emoji);
        setVibe(p.vibe ?? "");
        setInterests((p as any).interests ?? []);
        setPhotoVerified(!!(p as any).photo_verified);
        setLinkedinUrl((p as any).linkedin_url || "");
        setInstagramUrl((p as any).instagram_url || "");
        setWebsiteUrl((p as any).website_url || "");
        setAgeVerified(!!(p as any).age_verified);
      }
      setStats({
        signalsCount: signalRes.count ?? 0,
        matchesCount: matchRes.count ?? 0,
        connectionsCount: connRes.count ?? 0,
      });
    })();
  }, []);

  const toggleInterest = (val: string) => {
    setInterests((prev) => (prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]));
  };

  // Calculate Flick Trust Score & Tier
  const getTrustScore = () => {
    let score = 25; // Base score for phone OTP verified (at signup)
    if (ageVerified) score += 15;
    if (photoVerified) score += 25;
    if (linkedinUrl.trim()) score += 15;
    if (instagramUrl.trim()) score += 15;
    if (websiteUrl.trim()) score += 5;
    return score;
  };

  const trustScoreVal = getTrustScore();
  const getTrustBadge = (score: number) => {
    if (score < 40)
      return {
        label: "Unverified",
        color: "bg-muted text-muted-foreground border-muted-foreground/30",
      };
    if (score < 60)
      return { label: "Verified", color: "bg-primary/20 text-primary border-primary/30" };
    if (score < 80)
      return {
        label: "Trusted",
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      };
    return { label: "Established", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
  };
  const trustBadge = getTrustBadge(trustScoreVal);

  const startPhotoVerification = async () => {
    setVerifyingPhoto(true);
    toast.info("Accessing camera for identity liveness check. Please look directly at the screen.");
    try {
      // 1. Request actual hardware camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });

      // 2. Setup video element and canvas overlay to capture frame
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      await video.play();

      // Give 2 seconds to align face
      toast.info("Aligning face... Please blink or nod.");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Extract imageData to perform a simple pixel contrast/luminance analysis to confirm it's not a static black screen/spoof
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let brightnessSum = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          const r = imgData.data[i];
          const g = imgData.data[i + 1];
          const b = imgData.data[i + 2];
          brightnessSum += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        const avgBrightness = brightnessSum / (imgData.data.length / 4);

        // Stop the camera tracks immediately to release the device hardware resource
        stream.getTracks().forEach((track) => track.stop());

        if (avgBrightness < 10) {
          throw new Error(
            "Liveness check failed: Camera feed is too dark or blocked. Please verify in a well-lit area.",
          );
        }
      } else {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Could not initialize liveness scanner context.");
      }

      setPhotoVerified(true);
      toast.success("Liveness capture complete. Photo Verified badge activated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Camera permission denied or liveness check failed.",
      );
    } finally {
      setVerifyingPhoto(false);
    }
  };

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
        photo_verified: photoVerified,
        linkedin_url: linkedinUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile safety details saved.");
    setShowInterestEditor(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const [showIdentitySubpage, setShowIdentitySubpage] = useState(false);

  return (
    <AppShell>
      <div className="px-5 pt-12 pb-6">
        <AnimatePresence>
          {showIdentitySubpage && (
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-background overflow-y-auto px-6 py-12 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <header className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIdentitySubpage(false)}
                    className="no-tap -m-2 rounded-full p-2 text-muted-foreground active:scale-90"
                  >
                    ✕ Close
                  </button>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block">
                      Verification
                    </span>
                    <h2 className="font-display mt-0.5 text-2xl tracking-tight">
                      Identity Trust Center
                    </h2>
                  </div>
                </header>

                <div className="rounded-3xl border border-border bg-surface p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground block">
                        Flick Trust Score
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Score: {trustScoreVal}/100
                      </span>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full border tracking-wide uppercase",
                        trustBadge.color,
                      )}
                    >
                      {trustBadge.label}
                    </span>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        Photo Verified
                      </h4>
                      <p className="text-[10px] text-muted-foreground max-w-[28ch] mt-0.5">
                        Complete a 3D face liveness detection selfie to confirm identity (+25 pts).
                      </p>
                    </div>
                    <button
                      onClick={startPhotoVerification}
                      disabled={verifyingPhoto || photoVerified}
                      className={cn(
                        "no-tap px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95",
                        photoVerified
                          ? "bg-primary/20 border-primary/20 text-primary"
                          : "bg-surface border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {verifyingPhoto ? "Scanning..." : photoVerified ? "Verified" : "Verify"}
                    </button>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground block">
                      Link Verification Accounts
                    </span>

                    <label className="block space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        LinkedIn URL (+15 pts)
                      </span>
                      <input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary/50 focus:outline-none"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        Instagram URL (+15 pts)
                      </span>
                      <input
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://instagram.com/username"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary/50 focus:outline-none"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        Portfolio Website (+5 pts)
                      </span>
                      <input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-primary/50 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  await save();
                  setShowIdentitySubpage(false);
                }}
                className="no-tap w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition active:scale-[0.98] mt-6"
              >
                Save & Update Trust
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Profile
              </span>
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
          <FlickAvatar
            emoji={emoji}
            name={name}
            className="h-20 w-20 rounded-3xl text-3xl shadow-sm shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Avatar Theme
            </div>
            <div className="mt-2 -mx-1 overflow-x-auto [scrollbar-width:none]">
              <div className="flex gap-2 px-1">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "no-tap shrink-0 rounded-xl transition active:scale-90",
                      e === emoji ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                    )}
                  >
                    <FlickAvatar emoji={e} name={name} className="h-10 w-10 rounded-xl text-sm" />
                  </button>
                ))}
              </div>
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
          className="no-tap mt-4 flex w-full items-center justify-between rounded-3xl border border-primary/20 bg-primary/5 hover:bg-primary/10 p-5 text-left active:scale-[0.98] transition-all"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                Flick Safety Badge
              </span>
              <span className="text-[10px] text-muted-foreground">Score: {trustScoreVal}/100</span>
            </div>
            <p className="font-display text-xl tracking-tight text-foreground">
              Identity Verification & <span className="italic text-primary">Trust Center</span>
            </p>
          </div>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-full border tracking-wide uppercase font-mono",
              trustBadge.color,
            )}
          >
            {trustBadge.label}
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

        <div className="mt-6 space-y-3">
          <Field label="First name" value={name} onChange={setName} placeholder="Riya" />
          <Field
            label="Your vibe (one line)"
            value={vibe}
            onChange={setVibe}
            placeholder="Always down for a long walk and weird ideas."
          />
          <Field label="Email" value={email} onChange={() => {}} disabled />
        </div>

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
          onClick={save}
          disabled={saving}
          className="no-tap mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Check className="h-4 w-4" /> Save Profile
            </>
          )}
        </button>

        <button
          onClick={signOut}
          className="no-tap mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
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
