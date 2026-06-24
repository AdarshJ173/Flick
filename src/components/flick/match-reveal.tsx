import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { FlickAvatar } from "./avatar";
import { Sparkles, Heart } from "lucide-react";

type MatchRevealProps = {
  visible: boolean;
  otherName: string;
  otherAvatar: string;
  sharedIntent: string;
  onDismiss: () => void;
};

export function MatchReveal({
  visible,
  otherName,
  otherAvatar,
  sharedIntent,
  onDismiss,
}: MatchRevealProps) {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; size: number; angle: number }[]
  >([]);

  useEffect(() => {
    if (visible) {
      const colors = ["#caff33", "#f0c060", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"];
      setParticles(
        Array.from({ length: 28 }, (_, i) => ({
          id: i,
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
          color: colors[i % colors.length],
          size: 4 + Math.random() * 8,
          angle: (i / 28) * 360,
        })),
      );
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-8"
          onClick={onDismiss}
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-warm/20 blur-[120px]" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />
          </div>

          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                left: `${p.x}%`,
                top: `${p.y}%`,
              }}
              initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
              animate={{
                scale: [0, 1.4, 0.8, 0],
                opacity: [1, 1, 0.7, 0],
                x: Math.cos((p.angle * Math.PI) / 180) * (80 + Math.random() * 120),
                y: Math.sin((p.angle * Math.PI) / 180) * (80 + Math.random() * 120),
              }}
              transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}

          {/* Content */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            {/* Avatars with heart */}
            <div className="relative flex items-center justify-center mb-8">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <FlickAvatar
                  emoji="gradient-2"
                  name="You"
                  className="h-20 w-20 rounded-3xl shadow-2xl ring-4 ring-background"
                />
              </motion.div>

              <motion.div
                className="mx-[-8px] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-warm shadow-xl ring-4 ring-background"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Heart className="h-5 w-5 text-background fill-current" />
              </motion.div>

              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <FlickAvatar
                  emoji={otherAvatar}
                  name={otherName}
                  className="h-20 w-20 rounded-3xl shadow-2xl ring-4 ring-background"
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-2"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-warm mb-3">
                It's mutual
              </div>
              <h1 className="font-display text-5xl leading-none tracking-tight">You matched!</h1>
              <p className="mt-3 text-base text-muted-foreground max-w-[26ch]">
                You and <span className="text-foreground font-semibold">{otherName}</span> are both
                open to <span className="text-warm">{sharedIntent}</span>.
              </p>
              <p className="text-sm text-muted-foreground">90 minutes. Say something real.</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="no-tap mt-10 flex h-14 items-center justify-center gap-2 rounded-2xl bg-warm px-10 text-base font-semibold text-warm-foreground transition active:scale-[0.98]"
              onClick={onDismiss}
            >
              <Sparkles className="h-4 w-4" /> Say hi
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 text-xs text-muted-foreground/60"
            >
              Tap anywhere to open chat
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
