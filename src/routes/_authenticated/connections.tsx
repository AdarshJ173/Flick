import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { Users, MessageSquare, StickyNote, MoreVertical, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { intentByKey } from "@/lib/intents";

export const Route = createFileRoute("/_authenticated/connections")({
  component: ConnectionsPage,
});

type ConnectionRow = {
  id: string;
  created_at: string;
  notes: string | null;
  otherUser: {
    id: string;
    display_name: string;
    avatar_emoji: string;
    vibe: string | null;
    last_active_at: string | null;
  };
  matchId: string | null;
  lastMessage: { body: string; created_at: string; mine: boolean } | null;
  lastIntent: string | null;
};

function ConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function load() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      const { data: connData, error: connError } = await (supabase as any)
        .from("connections")
        .select("id,created_at,user_a,user_b,notes")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("created_at", { ascending: false });

      if (connError) throw connError;
      if (!connData || connData.length === 0) {
        setConnections([]);
        return;
      }

      const otherUserIds = connData.map((c: any) => (c.user_a === uid ? c.user_b : c.user_a));
      const connectionIds = connData.map((c: any) => c.id);

      const [{ data: profiles }, { data: matches }, { data: lastMsgs }, { data: signals }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_emoji,vibe")
            .in("id", otherUserIds),
          supabase
            .from("matches")
            .select("id,user_a,user_b,signal_id,created_at")
            .or(`user_a.eq.${uid},user_b.eq.${uid}`)
            .order("created_at", { ascending: false }),
          supabase
            .from("messages")
            .select("match_id,body,created_at,sender_id")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("signals").select("id,intent").limit(200),
        ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const userMatchMap = new Map<string, string>();
      if (matches) {
        for (const m of matches) {
          const otherId = m.user_a === uid ? m.user_b : m.user_a;
          if (!userMatchMap.has(otherId)) userMatchMap.set(otherId, m.id);
        }
      }
      const lastMessageByMatch = new Map<
        string,
        { body: string; created_at: string; sender_id: string }
      >();
      for (const m of lastMsgs ?? []) {
        if (!lastMessageByMatch.has(m.match_id)) lastMessageByMatch.set(m.match_id, m);
      }
      const intentBySignal = new Map<string, string>();
      for (const s of signals ?? []) intentBySignal.set(s.id, s.intent);

      const rows: ConnectionRow[] = connData.map((c: any) => {
        const otherId = c.user_a === uid ? c.user_b : c.user_a;
        const p = profileMap.get(otherId) ?? {
          id: otherId,
          display_name: "Someone",
          avatar_emoji: "gradient-1",
          vibe: null,
          last_active_at: null as string | null,
        };
        const matchId = userMatchMap.get(otherId) ?? null;
        const lastRaw = matchId ? lastMessageByMatch.get(matchId) : null;
        const lastMsg = lastRaw
          ? {
              body: lastRaw.body,
              created_at: lastRaw.created_at,
              mine: lastRaw.sender_id === uid,
            }
          : null;
        const match = matches?.find((m) => m.id === matchId);
        const intent = match ? (intentBySignal.get(match.signal_id) ?? null) : null;
        return {
          id: c.id,
          created_at: c.created_at,
          notes: c.notes ?? null,
          otherUser: p as ConnectionRow["otherUser"],
          matchId,
          lastMessage: lastMsg,
          lastIntent: intent,
        };
      });

      setConnections(rows);
    } catch (err) {
      console.error("Error loading connections:", err);
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNotes(row: ConnectionRow) {
    setEditing(row);
    setNoteText(row.notes ?? "");
    setNotesOpen(true);
  }

  async function saveNote() {
    if (!editing) return;
    setSavingNote(true);
    try {
      const { error } = await (supabase as any).rpc("set_connection_notes", {
        in_connection_id: editing.id,
        in_notes: noteText.trim() || null,
      });
      if (error) throw error;
      setConnections((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, notes: noteText.trim() || null } : r)),
      );
      toast.success("Note saved.");
      setNotesOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function clearNote() {
    if (!editing) return;
    setNoteText("");
  }

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <header>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Keep in touch
            </span>
          </div>
          <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
            Permanent <span className="italic text-primary">connections</span>.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            People you've both chosen to stay in touch with. Tap a card to message.
          </p>
        </header>

        {loading ? (
          <ul className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </ul>
        ) : connections.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              <Users className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="font-display mt-6 text-2xl">No connections yet.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select "Keep in touch" on active matches before the 2-hour window expires to build
              your network.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            <AnimatePresence>
              {connections.map((c, i) => {
                const intent = c.lastIntent ? intentByKey(c.lastIntent) : null;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ConnectionCardRow c={c} intent={intent} onOpenNotes={() => openNotes(c)} />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border bg-background p-0"
        >
          <div className="px-6 pb-8 pt-2">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader className="items-center text-center">
              {editing && (
                <FlickAvatar
                  emoji={editing.otherUser.avatar_emoji}
                  name={editing.otherUser.display_name}
                  className="h-14 w-14 rounded-2xl text-xl"
                />
              )}
              <SheetTitle className="mt-3 font-display text-xl">
                Private note on {editing?.otherUser.display_name}
              </SheetTitle>
              <SheetDescription>
                Only you can see this. Use it to remember context, plans, or how you met.
              </SheetDescription>
            </SheetHeader>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 600))}
              placeholder="Met at the corner cafe. Loves jazz. Working on a podcast."
              rows={5}
              className="mt-5 w-full resize-none rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {noteText.length}/600
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={clearNote}
                className="no-tap flex h-11 items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 text-sm font-medium text-destructive active:scale-95"
              >
                <Trash2 className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="no-tap flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function ConnectionCardRow({
  c,
  intent,
  onOpenNotes,
}: {
  c: ConnectionRow;
  intent: ReturnType<typeof intentByKey> | null;
  onOpenNotes: () => void;
}) {
  const navigate = useNavigate();
  const lastMsg = c.lastMessage;
  const timeAgo = (() => {
    if (!lastMsg) return "Connected";
    const created = new Date(lastMsg.created_at).getTime();
    if (!Number.isFinite(created)) return "Connected";
    const diff = Date.now() - created;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `${d}d`;
    return new Date(lastMsg.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4">
      <button
        onClick={() =>
          c.matchId && navigate({ to: "/match/$matchId", params: { matchId: c.matchId } })
        }
        className="no-tap flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <FlickAvatar
          emoji={c.otherUser.avatar_emoji}
          name={c.otherUser.display_name}
          className="h-14 w-14 shrink-0 rounded-2xl text-xl shadow-sm live-glow"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display truncate text-lg leading-tight">
              {c.otherUser.display_name}
            </h3>
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Permanent
            </span>
          </div>
          {lastMsg ? (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
              <span className="text-foreground/60">{lastMsg.mine ? "You: " : ""}</span>
              {lastMsg.body}
            </p>
          ) : intent ? (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              Met over {intent.label.toLowerCase()}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {c.otherUser.vibe || "No bio added yet."}
            </p>
          )}
        </div>
      </button>
      <div className="flex flex-col items-end gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {timeAgo}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNotes}
            aria-label="Private note"
            className={cn(
              "no-tap flex h-9 w-9 items-center justify-center rounded-xl border transition active:scale-95",
              c.notes
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
          {c.matchId && (
            <button
              onClick={() =>
                c.matchId && navigate({ to: "/match/$matchId", params: { matchId: c.matchId } })
              }
              className="no-tap flex h-9 items-center gap-1 rounded-xl bg-primary/10 px-2.5 text-[11px] font-semibold text-primary active:scale-95"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
