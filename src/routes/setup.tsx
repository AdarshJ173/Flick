import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Check, Heart, User, Camera, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  ssr: false,
  component: ProfileSetupPage,
});

import { FlickAvatar } from "@/components/flick/avatar";
import { AvatarPicker } from "@/components/flick/avatar-picker";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DICEBEAR_STYLE,
  dicebearUrl,
  isDicebearUrl,
  type DicebearStyle,
} from "@/lib/avatars";

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

const EMOJI_CHOICES = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "gradient-6",
];

function ProfileSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(() => dicebearUrl("flick", DEFAULT_DICEBEAR_STYLE));
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: lightweight age + community-guidelines confirm.
  // No ID, no OTP, no DigiLocker. The trust signal in Flick is behavioural
  // (account age + kept-in-touch count), not identity.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name,avatar_emoji,vibe,age_verified")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p) {
        if (p.age_verified) {
          navigate({ to: "/home" });
          return;
        }
        setName(p.display_name || "");
        if (p.avatar_emoji && isDicebearUrl(p.avatar_emoji)) {
          setEmoji(p.avatar_emoji);
        } else if (p.avatar_emoji && (p.avatar_emoji as string).startsWith("gradient-")) {
          setEmoji(p.avatar_emoji);
        } else {
          setEmoji(dicebearUrl(p.display_name || "flick"));
        }
        setVibe(p.vibe || "");
        setAgeConfirmed(!!p.age_verified);
      }
    })();
  }, [navigate]);

  const toggleInterest = (val: string) => {
    if (selectedInterests.includes(val)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== val));
    } else {
      setSelectedInterests([...selectedInterests, val]);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    if (!ageConfirmed || !guidelinesAccepted) {
      toast.error("Please confirm the two checkboxes to continue.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: name.trim() || "Someone",
        avatar_emoji: emoji,
        vibe: vibe.trim() || null,
        interests: selectedInterests,
        age_verified: ageConfirmed,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setStep(6);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col justify-between p-6">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[135px]" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-warm/15 blur-[120px]" />
      </div>

      {/* Header */}
      {step < 6 && (
        <header className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Profile Setup
          </span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Step {step} of 5
          </span>
        </header>
      )}

      {/* Wizard Step Body */}
      <div className="flex-1 flex items-center justify-center relative py-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="setup-step-consent"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="font-display text-3xl leading-none tracking-tight">
                  Welcome to Flick
                </h1>
                <p className="text-xs text-muted-foreground">
                  Two quick things before we set up your profile. No ID, no OTP — we trust
                  behaviour, not paperwork.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <label className="flex gap-3 cursor-pointer items-start">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 accent-primary h-4 w-4 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      I confirm I am 18 years or older.
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Flick is only for adults. By continuing you affirm this.
                    </p>
                  </div>
                </label>

                <div className="h-px bg-border/50" />

                <label className="flex gap-3 cursor-pointer items-start">
                  <input
                    type="checkbox"
                    checked={guidelinesAccepted}
                    onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                    className="mt-0.5 accent-primary h-4 w-4 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      I agree to the Community Guidelines.
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Be respectful. Don't share contact info before Keep-in-touch. Block and report
                      anything off.
                    </p>
                  </div>
                </label>
              </div>

              <button
                disabled={!ageConfirmed || !guidelinesAccepted}
                onClick={() => setStep(2)}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="setup-step-1"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-xs space-y-6"
            >
              <div className="space-y-2">
                <h1 className="font-display text-4xl leading-none tracking-tight">
                  What should <br />
                  <span className="italic text-primary">people call you?</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your first name is perfect. No handles or last names.
                </p>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Riya"
                maxLength={50}
                className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-lg text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />

              <button
                disabled={name.trim().length < 2}
                onClick={() => setStep(3)}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="setup-step-2"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="font-display text-4xl leading-none tracking-tight">
                  Pick your <span className="italic text-primary">avatar</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a style. Shuffle until it feels like you.
                </p>
              </div>

              <AvatarPicker
                initialUrl={isDicebearUrl(emoji) ? emoji : null}
                name={name}
                onChange={(url) => setEmoji(url)}
              />

              <button
                onClick={() => setStep(4)}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="setup-step-3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="font-display text-4xl leading-none tracking-tight">
                  What's <span className="italic text-primary">your vibe?</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Select at least 3 things you're interested in sharing.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1 justify-center [scrollbar-width:none]">
                {INTEREST_OPTIONS.map((interest) => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`no-tap px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 active:scale-95 ${
                        active
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-surface border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={selectedInterests.length < 3}
                onClick={() => setStep(5)}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                Continue ({selectedInterests.length}/3)
              </button>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="setup-step-4"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-xs space-y-6"
            >
              <div className="space-y-2">
                <h1 className="font-display text-4xl leading-none tracking-tight">
                  A line about <span className="italic text-primary">you</span>.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Keep it real, keep it brief. (Max 160 characters)
                </p>
              </div>

              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Trying to read 50 books this year. Failing delightfully."
                maxLength={160}
                rows={4}
                className="w-full rounded-2xl border border-border bg-surface p-4 text-base text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
              />

              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                {loading ? "Saving..." : "Done"}
              </button>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="setup-complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-xs text-center space-y-6"
            >
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-4xl">
                <Sparkles className="h-10 w-10 text-primary animate-bounce" />
              </div>
              <h1 className="font-display text-5xl leading-none tracking-tight">You're in.</h1>
              <p className="text-base text-muted-foreground">
                Now go somewhere interesting and make some spontaneous matches.
              </p>
              <button
                onClick={() => navigate({ to: "/home" })}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                Open Flick
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Setup Step Progress bar indicator */}
      {step < 6 && (
        <footer className="relative z-10 py-4 flex justify-center">
          <div className="w-full max-w-xs bg-muted/30 h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}
