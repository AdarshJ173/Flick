import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "flick_pwa_prompt_dismissed_at";
const SESSION_START_KEY = "flick_session_started_at";
const SHOW_AFTER_MS = 30_000;
const HIDE_FOR_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navAny.standalone === true
  );
}

function isDismissedRecently(): boolean {
  if (typeof localStorage === "undefined") return false;
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return false;
  const lastTs = Number(last);
  if (!Number.isFinite(lastTs)) return false;
  return Date.now() - lastTs < HIDE_FOR_DAYS * 24 * 60 * 60 * 1000;
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function PwaInstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [ios] = useState<boolean>(() => detectIOS());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    if (isDismissedRecently()) return;

    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    const tick = setInterval(() => {
      if (isStandalone() || installed) return;
      if (isDismissedRecently()) return;
      const started = Number(sessionStorage.getItem(SESSION_START_KEY) || 0);
      if (started && Date.now() - started >= SHOW_AFTER_MS) {
        setVisible(true);
        clearInterval(tick);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      clearInterval(tick);
    };
  }, [installed]);

  useEffect(() => {
    if (installed) setVisible(false);
  }, [installed]);

  if (installed) return null;

  async function handleInstall() {
    if (bip) {
      try {
        await bip.prompt();
        const choice = await bip.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        } else {
          dismiss();
        }
      } catch {
        dismiss();
      } finally {
        setBip(null);
      }
      return;
    }
    if (ios) {
      setIosHelpOpen(true);
      return;
    }
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  }

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(max(env(safe-area-inset-bottom),12px)+96px)]"
            role="dialog"
            aria-label="Install Flick on your phone"
          >
            <div className="pointer-events-auto relative w-full max-w-[21rem] overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-8 -bottom-12 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="no-tap absolute right-2 top-2 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="relative flex items-start gap-2.5">
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Download className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-dot rounded-full bg-primary ring-2 ring-surface-2" />
                </div>
                <div className="min-w-0 flex-1 pr-5">
                  <p className="font-display text-base leading-tight text-foreground">
                    Install <span className="italic text-primary">Flick</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    One tap from your home screen. Works offline.
                  </p>
                </div>
              </div>

              <div className="relative mt-3.5 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="no-tap group relative flex h-11 flex-[1.4] items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.92_0.2_122/0.55)] ring-1 ring-primary/20 transition-all active:scale-[0.97] hover:shadow-[0_12px_32px_-6px_oklch(0.92_0.2_122/0.7)]"
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <Download className="h-4 w-4" strokeWidth={2.4} />
                  <span>Install</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2.4}
                  />
                </button>
                <button
                  onClick={dismiss}
                  className="no-tap flex h-11 flex-1 items-center justify-center rounded-xl border border-border/60 bg-transparent text-xs font-medium text-muted-foreground transition-colors active:scale-95 hover:bg-surface-3 hover:text-foreground"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="max-w-[20rem] rounded-2xl border-border bg-surface-2 p-5 [&>button]:hidden">
          <DialogHeader className="space-y-1 text-left">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Plus className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <DialogTitle className="font-display text-xl text-foreground">
              Add <span className="italic text-primary">Flick</span> to your home screen
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Install in three quick steps. You'll be live in seconds.
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground">
                  Tap the{" "}
                  <Share
                    className="mx-0.5 inline h-3.5 w-3.5 -translate-y-0.5 text-primary"
                    strokeWidth={2.2}
                  />{" "}
                  Share button
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  It's at the bottom of Safari.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                2
              </span>
              <p className="flex-1 text-foreground">
                Scroll and tap{" "}
                <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-medium text-foreground">
                  Add to Home Screen
                </span>
              </p>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                3
              </span>
              <p className="flex-1 text-foreground">
                Tap <span className="font-semibold text-primary">Add</span> in the top-right corner.
              </p>
            </li>
          </ol>

          <button
            onClick={() => {
              setIosHelpOpen(false);
              dismiss();
            }}
            className="no-tap mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.97]"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
            Got it
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
