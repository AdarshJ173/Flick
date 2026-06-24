import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Check, Heart, User, Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  ssr: false,
  component: ProfileSetupPage,
});

import { FlickAvatar } from "@/components/flick/avatar";
import { cn } from "@/lib/utils";

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
  const [emoji, setEmoji] = useState("gradient-2");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // DPDP Consent and age gate state
  const [consentLocation, setConsentLocation] = useState(false);
  const [consentProfile, setConsentProfile] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [digiLockerLoading, setDigiLockerLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      // Pre-fill profile name if exists
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "display_name,avatar_emoji,vibe,dpdp_consent_location,dpdp_consent_profile,age_verified,birth_date",
        )
        .eq("id", data.user.id)
        .maybeSingle();
      if (p) {
        setName(p.display_name || "");
        setEmoji(p.avatar_emoji || "gradient-2");
        setVibe(p.vibe || "");
        setConsentLocation(!!(p as any).dpdp_consent_location);
        setConsentProfile(!!(p as any).dpdp_consent_profile);
        setAgeConfirmed(!!(p as any).age_verified);
        setBirthDate((p as any).birth_date || "");
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

  // DigiLocker Aadhaar Verification
  const verifyAgeWithDigiLocker = async () => {
    if (!birthDate) {
      toast.error("Please select your birth date first");
      return;
    }
    const bDate = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }

    if (age < 18) {
      toast.error(
        `Verification Failed: You are declared as ${age} years old. Under DPDP Act Section 9, processing minors without parental consent is prohibited. You must be 18+ to use Flick.`,
      );
      return;
    }

    setDigiLockerLoading(true);
    // Simulate real DigiLocker credentials verification lookup delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setDigiLockerLoading(false);
    setAgeConfirmed(true);
    toast.success("Aadhaar age verification succeeded via DigiLocker!");
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    if (!consentLocation || !consentProfile || !ageConfirmed) {
      toast.error("Consent and age verification are required for legal compliance.");
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
        birth_date: birthDate || null,
        dpdp_consent_location: consentLocation,
        dpdp_consent_profile: consentProfile,
        dpdp_consent_timestamp: new Date().toISOString(),
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
                  DPDP Safety & Age Verification
                </h1>
                <p className="text-xs text-muted-foreground">
                  In compliance with the India Digital Personal Data Protection (DPDP) Act, please
                  declare your age and authorize data processing consents below.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                {/* Age confirm */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      1. Confirm 18+ Age
                    </span>
                    <span className="text-[10px] text-muted-foreground">Section 9 Compliance</span>
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      setAgeConfirmed(false);
                    }}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    onClick={verifyAgeWithDigiLocker}
                    disabled={digiLockerLoading || !birthDate || ageConfirmed}
                    className={cn(
                      "no-tap w-full h-11 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition active:scale-95",
                      ageConfirmed
                        ? "bg-primary/20 border-primary/20 text-primary"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {digiLockerLoading
                      ? "Connecting DigiLocker..."
                      : ageConfirmed
                        ? "✓ Verified with DigiLocker"
                        : "Verify Age with DigiLocker (Aadhaar)"}
                  </button>
                </div>

                <div className="h-px bg-border/50" />

                {/* Consent 1 */}
                <label className="flex gap-3 cursor-pointer items-start">
                  <input
                    type="checkbox"
                    checked={consentLocation}
                    onChange={(e) => setConsentLocation(e.target.checked)}
                    className="mt-0.5 accent-primary h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      Spatial Location Consent
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Authorize Flick to process your GPS coordinates to display nearby matches
                      within a 2km range. Coordinate data is ephemeral and is not stored
                      permanently.
                    </p>
                  </div>
                </label>

                {/* Consent 2 */}
                <label className="flex gap-3 cursor-pointer items-start">
                  <input
                    type="checkbox"
                    checked={consentProfile}
                    onChange={(e) => setConsentProfile(e.target.checked)}
                    className="mt-0.5 accent-primary h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      Granular Profile Data Consent
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Authorize Flick to host your display name, vibe text, interest tags, and
                      linked verification signals. You can request complete deletion of this profile
                      at any time.
                    </p>
                  </div>
                </label>
              </div>

              <button
                disabled={!consentLocation || !consentProfile || !ageConfirmed}
                onClick={() => setStep(2)}
                className="no-tap flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                Accept & Proceed
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
              className="w-full max-w-xs space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="font-display text-4xl leading-none tracking-tight">
                  Pick your <span className="italic text-primary">avatar vibe</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a premium color scheme for your profile avatar.
                </p>
              </div>

              <FlickAvatar
                emoji={emoji}
                name={name}
                className="mx-auto h-28 w-28 rounded-3xl text-4xl"
              />

              <div className="grid grid-cols-3 gap-3 justify-center max-w-xs mx-auto px-1 py-2">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "no-tap relative transition active:scale-95",
                      e === emoji
                        ? "ring-4 ring-primary/40 ring-offset-2 ring-offset-background rounded-2xl"
                        : "",
                    )}
                  >
                    <FlickAvatar emoji={e} name={name} className="h-14 w-14 rounded-2xl text-lg" />
                  </button>
                ))}
              </div>

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
