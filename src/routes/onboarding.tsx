import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, MapPin, Bell, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const totalSteps = 4;

  const next = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("flick_onboarding_done", "true");
      navigate({ to: "/auth" });
    }
  };

  const skip = () => {
    localStorage.setItem("flick_onboarding_done", "true");
    navigate({ to: "/auth" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col justify-between p-6">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-warm/15 blur-[110px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Flick
          </span>
        </div>
        {step < totalSteps - 1 && (
          <button
            onClick={skip}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition active:scale-95"
          >
            Skip
          </button>
        )}
      </header>

      {/* Main Content Carousel */}
      <div className="flex-1 flex items-center justify-center relative py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full text-center max-w-xs space-y-6"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-2 shadow-sm">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight">
                The people you were meant to meet are{" "}
                <span className="italic text-primary">already near you</span>.
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Flick broadcasts that you're present and open, in this exact location. No permanent
                footprints, just physical reality.
              </p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full space-y-6"
            >
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-primary text-center">
                How it works
              </h2>
              <div className="space-y-5">
                <HowItem
                  num="1"
                  title="Say you're here"
                  desc="Flick your live status with a quick vibe (like 'grabbing coffee')."
                />
                <HowItem
                  num="2"
                  title="Stay completely invisible"
                  desc="No profiles to browse. You only see each other if the feeling is mutual."
                />
                <HowItem
                  num="3"
                  title="90-minute window"
                  desc="Once matched, you get a temporary 90-minute chat to meet up in person."
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full text-center max-w-xs space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
                <ShieldCheck className="h-8 w-8 text-warm" />
              </div>
              <h2 className="font-display text-3xl leading-tight tracking-tight">
                Invisible until it's <span className="italic text-warm">mutual</span>.
              </h2>
              <div className="space-y-4 text-left">
                <BulletPoint text="Nobody sees your location or identity unless you both say yes." />
                <BulletPoint text="Signals expire after 90 minutes. No lingering trace." />
                <BulletPoint text="No rejection. You only discover who matched, never who skipped." />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xs space-y-6"
            >
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                  <MapPin className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <h2 className="font-display mt-4 text-3xl tracking-tight">One last thing.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Flick relies on your device location to match you within 500m–2km.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        () => {
                          toast.success("Location access enabled!");
                          next();
                        },
                        () => {
                          toast.error(
                            "Location permission denied. You can enable it in system settings.",
                          );
                        },
                      );
                    }
                  }}
                  className="no-tap flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98]"
                >
                  <MapPin className="h-4 w-4" /> Allow Location
                </button>
                <button
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                          toast.success("Notifications enabled!");
                        }
                        next();
                      });
                    } else {
                      next();
                    }
                  }}
                  className="no-tap flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground transition active:scale-[0.98]"
                >
                  <Bell className="h-4 w-4" /> Enable Notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <footer className="relative z-10 flex flex-col items-center gap-4">
        {/* Step Indicator dots */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {step < totalSteps - 1 && (
          <button
            onClick={next}
            className="no-tap mt-2 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

function HowItem({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm font-bold text-primary">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-base leading-snug">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-primary mt-0.5">•</span>
      <span className="text-muted-foreground leading-relaxed">{text}</span>
    </div>
  );
}
