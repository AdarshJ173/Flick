import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { intentByKey } from "@/lib/intents";
import { ArrowLeft, Send } from "lucide-react";
import { cn, getAvatarStyle } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/match/$matchId")({
  component: MatchPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const [{ data: p }, { data: s }, { data: msgs }] = await Promise.all([
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
      ]);
      setOther(p ?? { display_name: "Someone", avatar_emoji: "gradient-2" });
      setIntent(s?.intent ?? "");
      setMessages(msgs ?? []);
    })();
  }, [matchId, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((arr) => [...arr, payload.new as Msg]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function send() {
    if (!draft.trim() || !uid) return;
    const body = draft.trim();
    setDraft("");
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
  const expired = remain === 0;

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
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold shadow-sm", getAvatarStyle(other?.avatar_emoji ?? ""))}>
          {(other?.display_name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-base leading-tight">
            {other?.display_name ?? "—"}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <intentObj.icon className="h-3.5 w-3.5 text-muted-foreground" /> open to {intentObj.label.toLowerCase()}
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-warm whitespace-nowrap">
          {expired ? "ended" : `${mins}m left`}
        </div>
      </header>

      {/* Reveal banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-3 rounded-2xl border border-warm/30 bg-warm/10 px-4 py-3 text-center"
      >
        <div className="font-display text-lg leading-tight text-warm">It's mutual.</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          You both said yes. Say something — the chat ends in {mins} min.
        </div>
      </motion.div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Be the one who breaks the ice.
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} mine={m.sender_id === uid} body={m.body} time={m.created_at} />
        ))}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 z-10 bg-background/80 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
          mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-surface-2 text-foreground"
        }`}
      >
        {body}
      </div>
    </motion.div>
  );
}
