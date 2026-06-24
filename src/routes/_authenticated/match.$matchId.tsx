import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { intentByKey } from "@/lib/intents";
import { ArrowLeft, Send, AlertTriangle, Heart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";

export const Route = createFileRoute("/_authenticated/match/$matchId")({
  component: MatchPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [other, setOther] = useState<{ display_name: string; avatar_emoji: string } | null>(null);
  const [intent, setIntent] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const [keptTouch, setKeptTouch] = useState(false);
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // Noonlight Safe Mode States
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [sosCountdownActive, setSosCountdownActive] = useState(false);
  const [sosTimeRemaining, setSosTimeRemaining] = useState(10);
  const [safeCheckinMinutes, setSafeCheckinMinutes] = useState(30);
  const sosIntervalRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUid(u.user.id);

      const { data: m } = await supabase
        .from("matches")
        .select("user_a,user_b,signal_id,expires_at")
        .eq("id", matchId)
        .maybeSingle();
      if (!m) {
        toast.error("Match not found");
        navigate({ to: "/matches" });
        return;
      }
      setExpiresAt(m.expires_at);

      const otherId = m.user_a === u.user.id ? m.user_b : m.user_a;
      setOtherUserId(otherId);
      const [{ data: p }, { data: s }, { data: msgs }, { data: keepData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,avatar_emoji")
          .eq("id", otherId)
          .maybeSingle(),
        supabase.from("signals").select("intent").eq("id", m.signal_id).maybeSingle(),
        supabase
          .from("messages")
          .select("id,sender_id,body,created_at")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true }),
        (supabase as any).from("match_keep_in_touch").select("user_id").eq("match_id", matchId),
      ]);

      setOther(p ?? { display_name: "Someone", avatar_emoji: "gradient-2" });
      setIntent(s?.intent ?? "");
      setMessages(msgs ?? []);
      if (keepData) setKeptTouch(keepData.some((row: any) => row.user_id === u.user.id));
    })();
  }, [matchId, navigate]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((arr) => [...arr, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Clock & Safe check-in countdown tracking
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // SOS Countdown Timer
  useEffect(() => {
    if (sosCountdownActive) {
      sosIntervalRef.current = setInterval(() => {
        setSosTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(sosIntervalRef.current);
            setSosCountdownActive(false);
            toast.error(
              "SOS Triggered! Dispatching emergency response to your location via Noonlight Dispatch.",
              { duration: 6000 },
            );
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
      setSosTimeRemaining(10);
    }
    return () => {
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    };
  }, [sosCountdownActive]);

  async function handleBlockReport() {
    if (!otherUserId) return;
    const confirm = window.confirm(
      "Report this conversation for review and permanently block this user?",
    );
    if (!confirm) return;
    try {
      // 1. Block user
      const { error: blockErr } = await supabase.rpc("block_user", { in_blocked_id: otherUserId });
      if (blockErr) throw blockErr;
      // 2. Insert report
      await supabase.from("reports").insert({
        reporter_id: uid!,
        reported_id: otherUserId,
        reason: "Harassment/Safety concern in chat",
      });
      // 3. Mark active signal to inactive or delete matches
      await supabase.from("matches").delete().eq("id", matchId);
      toast.success("User reported and blocked.");
      navigate({ to: "/matches" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function toggleKeepTouch() {
    if (!uid || keptTouch) return;
    try {
      const { error } = await (supabase as any)
        .from("match_keep_in_touch")
        .insert({ match_id: matchId, user_id: uid });
      if (error) throw error;
      setKeptTouch(true);
      toast.success("Interest sent. If it's mutual, connection is permanent.");
      const { data: currentKept } = await (supabase as any)
        .from("match_keep_in_touch")
        .select("user_id")
        .eq("match_id", matchId);
      if (currentKept?.length === 2) toast.success("Mutual! You are now permanently connected.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save decision");
    }
  }

  async function send() {
    if (!draft.trim() || !uid) return;
    const body = draft.trim();
    setDraft("");
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const { error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: uid, body });
    if (error) {
      toast.error(error.message);
      setDraft(body);
    }
  }

  const intentObj = intentByKey(intent);
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const remain = Math.max(0, expiresMs - now);
  const mins = Math.floor(remain / 60000);
  const secs = Math.floor((remain % 60000) / 1000);
  const expired = remain === 0;
  const isUrgent = !expired && mins < 10;
  const isWarning = !expired && mins < 30;
  const showKeepInTouch = !expired && !keptTouch && mins < 60;

  // Group messages by date
  type GroupedMsg = { date: string; messages: Msg[] };
  const grouped = messages.reduce<GroupedMsg[]>((acc, msg) => {
    const dateLabel = formatRelativeDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === dateLabel) {
      last.messages.push(msg);
    } else {
      acc.push({ date: dateLabel, messages: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="relative mx-auto flex h-screen w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-20 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate({ to: "/matches" })}
          className="no-tap -m-2 rounded-full p-2 text-muted-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <FlickAvatar
          emoji={other?.avatar_emoji ?? "gradient-2"}
          name={other?.display_name ?? "Someone"}
          className="h-10 w-10 rounded-xl text-base shrink-0 shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-base leading-tight">
            {other?.display_name ?? "—"}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <intentObj.icon className="h-3.5 w-3.5" strokeWidth={2} />
            open to {intentObj.label.toLowerCase()}
          </div>
        </div>
        <button
          onClick={handleBlockReport}
          className="no-tap text-xs text-destructive font-semibold px-2.5 py-1 rounded-xl bg-destructive/10 border border-destructive/20 active:scale-95"
        >
          Block
        </button>
        <div
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap ml-1",
            expired
              ? "text-muted-foreground"
              : isUrgent
                ? "text-destructive"
                : isWarning
                  ? "text-warm"
                  : "text-warm",
          )}
        >
          {expired ? "ended" : `${mins}m ${secs.toString().padStart(2, "0")}s`}
        </div>
      </header>

      {/* Noonlight Safe Mode Bodyguard Widget */}
      {!expired && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mx-4 mt-3 rounded-2xl border p-4 transition-all duration-300",
            safeModeActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-surface",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  safeModeActive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground",
                )}
              />
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Noonlight Safe Mode
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Silent monitoring & GPS bodyguard
                </span>
              </div>
            </div>
            <button
              onClick={() => setSafeModeActive((prev) => !prev)}
              className={cn(
                "no-tap px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95",
                safeModeActive
                  ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {safeModeActive ? "Active" : "Turn On"}
            </button>
          </div>

          {safeModeActive && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Safe check-in timer:</span>
                <span className="font-mono text-foreground font-semibold">
                  {safeCheckinMinutes} minutes
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={120}
                step={15}
                value={safeCheckinMinutes}
                onChange={(e) => setSafeCheckinMinutes(+e.target.value)}
                className="w-full accent-emerald-500 h-1 bg-surface-2 rounded-full cursor-pointer"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setSosCountdownActive((prev) => !prev)}
                  className={cn(
                    "no-tap flex-1 h-10 text-xs font-bold rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-1.5",
                    sosCountdownActive
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-destructive/15 text-destructive border border-destructive/20",
                  )}
                >
                  {sosCountdownActive
                    ? `Cancel SOS in ${sosTimeRemaining}s`
                    : "Trigger SOS (Alarm)"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Mutual banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-3 rounded-2xl border border-warm/30 bg-warm/10 px-4 py-3 text-center"
      >
        <div className="font-display text-lg leading-tight text-warm">It's mutual.</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {expired ? "The window has closed." : `You both said yes. Say something — ${mins}m left.`}
        </div>
      </motion.div>

      {/* 15-min warning banner */}
      <AnimatePresence>
        {isWarning && !isUrgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2 overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-warm/40 bg-warm/10 px-3.5 py-2.5 text-xs text-warm">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Less than 30 minutes left. Say something worth remembering.
            </div>
          </motion.div>
        )}
        {isUrgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2 overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-pulse" />
              Closing in {mins}m — don't let this moment slip.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            {expired ? "This conversation has ended." : "Be the one who breaks the ice."}
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-mono">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-1.5">
              {group.messages.map((m) => (
                <Bubble key={m.id} mine={m.sender_id === uid} body={m.body} time={m.created_at} />
              ))}
            </div>
          </div>
        ))}

        {/* Expired state */}
        {expired && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center text-center py-6 rounded-3xl border border-border/40 bg-surface/30"
          >
            <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">This window has closed.</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-[24ch]">
              Your conversation is archived for 7 days, then deleted.
            </p>
          </motion.div>
        )}
      </div>

      {/* Keep in Touch widget */}
      <AnimatePresence>
        {showKeepInTouch && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-2 p-3 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Enjoying the vibe?</span>
              <span className="text-[10px] text-muted-foreground">Keep in touch permanently.</span>
            </div>
            <button
              onClick={toggleKeepTouch}
              disabled={keptTouch}
              className={cn(
                "no-tap px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5",
                keptTouch
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-warm text-warm-foreground",
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", keptTouch ? "" : "fill-current")} />
              {keptTouch ? "Requested" : "Keep in touch"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message input */}
      <div className="sticky bottom-0 z-10 bg-background/80 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={expired ? "Chat has ended" : "Say something real…"}
            disabled={expired}
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || expired}
            className="no-tap flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ mine, body, time }: { mine: boolean; body: string; time: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[78%] space-y-1 ${mine ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-surface-2 text-foreground"
          }`}
        >
          {body}
        </div>
        <span className="text-[10px] text-muted-foreground/50 px-1">{formatTime(time)}</span>
      </div>
    </motion.div>
  );
}
