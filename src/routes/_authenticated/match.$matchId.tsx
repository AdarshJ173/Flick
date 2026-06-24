import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { intentByKey, type Intent } from "@/lib/intents";
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  Heart,
  Clock,
  ChevronDown,
  Smile,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { ChatProfileSheet, type ChatProfileUser } from "@/components/flick/chat-profile-sheet";

export const Route = createFileRoute("/_authenticated/match/$matchId")({
  component: MatchPage,
});

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Reaction = { emoji: string; count: number; mine: boolean };

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "😢", "👍"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfDay) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [other, setOther] = useState<ChatProfileUser | null>(null);
  const [intent, setIntent] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const [keptTouch, setKeptTouch] = useState(false);
  const [otherLastActive, setOtherLastActive] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const [{ data: p }, { data: s }, { data: msgs }, { data: keepData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,avatar_emoji,vibe,interests,photo_verified,age_verified")
          .eq("id", otherId)
          .maybeSingle(),
        supabase.from("signals").select("intent,place_label").eq("id", m.signal_id).maybeSingle(),
        supabase
          .from("messages")
          .select("id,sender_id,body,created_at")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true }),
        (supabase as any).from("match_keep_in_touch").select("user_id").eq("match_id", matchId),
      ]);

      if (p) {
        const fullProfile = await (supabase as any)
          .from("profiles")
          .select("last_active_at")
          .eq("id", otherId)
          .maybeSingle();
        setOther({
          id: otherId,
          display_name: p.display_name ?? "Someone",
          avatar_emoji: (p as any).avatar_emoji ?? "gradient-2",
          vibe: (p as any).vibe ?? null,
          interests: (p as any).interests ?? null,
          photo_verified: !!(p as any).photo_verified,
          age_verified: !!(p as any).age_verified,
          place_label: (s as any)?.place_label ?? null,
        });
        setOtherLastActive(fullProfile?.last_active_at ?? null);
      }
      setIntent(s?.intent ?? "");
      setMessages(msgs ?? []);
      if (keepData) setKeptTouch(keepData.some((row: any) => row.user_id === u.user.id));
    })();
  }, [matchId, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((arr) => (arr.find((x) => x.id === m.id) ? arr : [...arr, m]));
          if (m.sender_id !== uid && !stickToBottom) {
            setUnreadCount((c) => c + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, uid, stickToBottom]);

  useEffect(() => {
    if (!uid || messages.length === 0) return;
    const channel = supabase
      .channel(`reactions-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        loadReactions();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };

    async function loadReactions() {
      const msgIds = messages.map((m) => m.id);
      if (msgIds.length === 0) return;
      const { data } = await (supabase as any)
        .from("message_reactions")
        .select("message_id,user_id,emoji")
        .in("message_id", msgIds);
      if (!data) return;
      const grouped: Record<string, Reaction[]> = {};
      for (const r of data as Array<{ message_id: string; user_id: string; emoji: string }>) {
        grouped[r.message_id] = grouped[r.message_id] || [];
        const existing = grouped[r.message_id].find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count += 1;
          if (r.user_id === uid) existing.mine = true;
        } else {
          grouped[r.message_id].push({
            emoji: r.emoji,
            count: 1,
            mine: r.user_id === uid,
          });
        }
      }
      setReactions(grouped);
    }
    loadReactions();
  }, [matchId, uid, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setStickToBottom(atBottom);
      if (atBottom) setUnreadCount(0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, stickToBottom]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!uid) return;
    (supabase as any)
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", uid)
      .then(() => undefined);
  }, [uid]);

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
    if (!draft.trim() || !uid || !stickToBottom) return;
    const body = draft.trim();
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const { error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: uid, body });
    if (error) {
      toast.error(error.message);
      setDraft(body);
    } else {
      setStickToBottom(true);
    }
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!uid) return;
    const existing = reactions[msgId]?.find((r) => r.emoji === emoji);
    try {
      if (existing?.mine) {
        await (supabase as any)
          .from("message_reactions")
          .delete()
          .eq("message_id", msgId)
          .eq("user_id", uid)
          .eq("emoji", emoji);
      } else {
        await (supabase as any)
          .from("message_reactions")
          .insert({ message_id: msgId, user_id: uid, emoji });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't react");
    }
    setActiveReactionMsgId(null);
  }

  const intentObj = intentByKey(intent) as Intent;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const remain = Math.max(0, expiresMs - now);
  const mins = Math.floor(remain / 60000);
  const secs = Math.floor((remain % 60000) / 1000);
  const expired = remain === 0;
  const isUrgent = !expired && mins < 10;
  const isWarning = !expired && mins < 30;
  const showKeepInTouch = !expired && !keptTouch && mins < 60;

  const grouped = messages.reduce<{ date: string; messages: Msg[] }[]>((acc, msg) => {
    const dateLabel = formatRelativeDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === dateLabel) last.messages.push(msg);
    else acc.push({ date: dateLabel, messages: [msg] });
    return acc;
  }, []);

  const lastSeen = (() => {
    if (!otherLastActive) return null;
    const diffMs = now - new Date(otherLastActive).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 2) return "Active now";
    if (min < 60) return `Active ${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `Last seen ${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `Last seen ${d}d ago`;
  })();

  return (
    <div className="container-page relative flex h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => navigate({ to: "/matches" })}
            className="no-tap -m-2 shrink-0 rounded-full p-2 text-muted-foreground active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="no-tap flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 pr-1 text-left active:scale-[0.99]"
            aria-label="Open profile"
          >
            <FlickAvatar
              emoji={other?.avatar_emoji ?? "gradient-2"}
              name={other?.display_name ?? "Someone"}
              className="h-9 w-9 shrink-0 rounded-xl text-base shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
                  {other?.display_name ?? "—"}
                </h1>
                {lastSeen === "Active now" && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                )}
              </div>
              <p className="truncate text-[10px] text-muted-foreground">
                {lastSeen ? lastSeen : `Open to ${intentObj.label.toLowerCase()}`}
              </p>
            </div>
          </button>
          <button
            onClick={() => setHeaderMenuOpen((v) => !v)}
            className="no-tap -mr-1 shrink-0 rounded-full p-2 text-muted-foreground active:scale-90"
            aria-label="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {headerMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-3 top-12 z-30 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            >
              <button
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setProfileOpen(true);
                }}
                className="no-tap block w-full px-3 py-2.5 text-left text-xs text-foreground hover:bg-surface-2"
              >
                View profile
              </button>
              <button
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setProfileOpen(true);
                }}
                className="no-tap block w-full px-3 py-2.5 text-left text-xs text-foreground hover:bg-surface-2"
              >
                Mute / Block
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Subtle match banner */}
      {!expired && (
        <div className="border-b border-warm/15 bg-warm/5 px-4 py-2 text-center text-[11px] text-warm">
          It's mutual. {mins}m {secs.toString().padStart(2, "0")}s left to make it count.
        </div>
      )}

      <AnimatePresence>
        {isWarning && !isUrgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-warm/20 bg-warm/10 px-4 py-2 text-[11px] text-warm">
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
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-[11px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-pulse" />
              Closing in {mins}m — don't let this moment slip.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-4 py-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 && (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            {expired ? "This conversation has ended." : "Be the one who breaks the ice."}
          </div>
        )}

        {grouped.length === 1 && grouped[0] && (
          <div className="mb-4 mt-2 flex justify-center">
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] text-muted-foreground">
              You matched on {intentObj.label.toLowerCase()} — say hi 👋
            </span>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date} className="mb-1">
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="space-y-1">
              {group.messages.map((m, i) => {
                const mine = m.sender_id === uid;
                const prevSame = i > 0 && group.messages[i - 1].sender_id === m.sender_id;
                const ts = formatTime(m.created_at);
                const msgReactions = reactions[m.id] || [];
                return (
                  <Bubble
                    key={m.id}
                    mine={mine}
                    body={m.body}
                    time={ts}
                    showTime={!prevSame}
                    reactions={msgReactions}
                    showReactions={activeReactionMsgId === m.id || msgReactions.length > 0}
                    onLongPress={() =>
                      setActiveReactionMsgId((cur) => (cur === m.id ? null : m.id))
                    }
                    onReact={(emoji) => toggleReaction(m.id, emoji)}
                    reactionPickerOpen={activeReactionMsgId === m.id}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {expired && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center rounded-3xl border border-border/40 bg-surface/30 px-6 py-8 text-center"
          >
            <Clock className="mb-3 h-9 w-9 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">This window has closed.</p>
            <p className="mt-1 max-w-[26ch] text-xs text-muted-foreground/60">
              {showKeepInTouch
                ? "Tap below to keep in touch — this becomes permanent if both say yes."
                : "Your conversation is archived for 7 days, then deleted."}
            </p>
          </motion.div>
        )}

        {/* Floating "new messages" pill */}
        <AnimatePresence>
          {!stickToBottom && unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => {
                setStickToBottom(true);
                setUnreadCount(0);
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
              className="sticky bottom-2 left-1/2 z-10 -translate-x-1/2 transform"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-xl">
                <ChevronDown className="h-3 w-3" /> {unreadCount} new{" "}
                {unreadCount === 1 ? "message" : "messages"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showKeepInTouch && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-3 mb-2 flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Enjoying the vibe?</span>
              <span className="text-[10px] text-muted-foreground">Keep in touch permanently.</span>
            </div>
            <button
              onClick={toggleKeepTouch}
              disabled={keptTouch}
              className={cn(
                "no-tap rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5",
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

      {/* Composer */}
      <div className="border-t border-border bg-background/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveReactionMsgId(null)}
            className="no-tap hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-muted-foreground active:scale-90 sm:flex"
            aria-label="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
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
            aria-label="Send"
          >
            {draft.trim() ? (
              <Send className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 opacity-0" />
            )}
          </button>
        </form>
      </div>

      <ChatProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={other}
        intent={intentObj}
        matchId={matchId}
        currentUserId={uid ?? ""}
        onBlocked={() => navigate({ to: "/matches" })}
      />
    </div>
  );
}

function Bubble({
  mine,
  body,
  time,
  showTime,
  reactions,
  showReactions,
  reactionPickerOpen,
  onLongPress,
  onReact,
}: {
  mine: boolean;
  body: string;
  time: string;
  showTime: boolean;
  reactions: Reaction[];
  showReactions: boolean;
  reactionPickerOpen: boolean;
  onLongPress: () => void;
  onReact: (emoji: string) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);

  function startPress() {
    touched.current = true;
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 420);
  }
  function endPress() {
    touched.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex", mine ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[78%] flex flex-col", mine ? "items-end" : "items-start")}>
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => {
            e.preventDefault();
            onLongPress();
          }}
          className={cn(
            "select-none rounded-2xl px-3.5 py-2 text-[15px] leading-snug break-words",
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-surface-2 text-foreground",
          )}
        >
          {body}
        </div>
        {showReactions && (
          <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  "no-tap inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]",
                  r.mine
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-surface-2 text-muted-foreground",
                )}
              >
                <span>{r.emoji}</span>
                <span className="font-mono">{r.count}</span>
              </button>
            ))}
          </div>
        )}
        {reactionPickerOpen && (
          <div
            className={cn(
              "mt-1 flex gap-1 rounded-full border border-border bg-surface px-1.5 py-1 shadow-xl",
              mine ? "self-end" : "self-start",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="no-tap rounded-full px-1.5 py-0.5 text-base transition active:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        {showTime && (
          <span className="mt-0.5 px-1 text-[10px] text-muted-foreground/60">{time}</span>
        )}
      </div>
    </motion.div>
  );
}
