import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { intentByKey } from "@/lib/intents";
import { MessageCircle, ArrowUpRight, Clock, Users, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
});

type Row = {
  id: string;
  created_at: string;
  expires_at: string;
  user_a: string;
  user_b: string;
  signal_id: string;
  other: { id: string; display_name: string; avatar_emoji: string } | null;
  intent: string | null;
  last_message: string | null;
  last_message_at: string | null;
  isActive: boolean;
};

type ConnectionRow = {
  id: string;
  otherId: string;
  otherName: string;
  otherAvatar: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
  lastIntent: string | null;
  matchId: string | null;
  createdAt: string;
};

type TabKey = "active" | "recent" | "permanent";

function MatchesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("active");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function load() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: matches } = await supabase
        .from("matches")
        .select("id,created_at,expires_at,user_a,user_b,signal_id")
        .gt("created_at", since)
        .order("created_at", { ascending: false });

      const { data: connData } = await (supabase as any)
        .from("connections")
        .select("id,user_a,user_b,created_at")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("created_at", { ascending: false });

      if ((!matches || matches.length === 0) && (!connData || connData.length === 0)) {
        setRows([]);
        setConnections([]);
        return;
      }

      const otherIds = new Set<string>();
      const signalIds = new Set<string>();
      for (const m of matches ?? []) {
        otherIds.add(m.user_a === uid ? m.user_b : m.user_a);
        signalIds.add(m.signal_id);
      }
      for (const c of connData ?? []) {
        otherIds.add(c.user_a === uid ? c.user_b : c.user_a);
      }

      const [{ data: profiles }, { data: signals }, { data: lasts }, { data: allMsgs }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_emoji")
            .in("id", Array.from(otherIds)),
          supabase.from("signals").select("id,intent").in("id", Array.from(signalIds)),
          supabase
            .from("messages")
            .select("match_id,body,created_at,sender_id")
            .in(
              "match_id",
              (matches ?? []).map((m) => m.id),
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("messages")
            .select("match_id,body,created_at,sender_id")
            .order("created_at", { ascending: false })
            .limit(500),
        ]);

      const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const sigMap = new Map((signals ?? []).map((s) => [s.id, s.intent]));
      const lastMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
      for (const m of lasts ?? []) if (!lastMap.has(m.match_id)) lastMap.set(m.match_id, m);

      const now = new Date().toISOString();
      setRows(
        (matches ?? []).map((m) => {
          const otherId = m.user_a === uid ? m.user_b : m.user_a;
          const last = lastMap.get(m.id);
          return {
            ...m,
            other: profMap.get(otherId) ?? null,
            intent: sigMap.get(m.signal_id) ?? null,
            last_message: last?.body ?? null,
            last_message_at: last?.created_at ?? null,
            isActive: m.expires_at > now,
          };
        }),
      );

      if (connData && connData.length > 0) {
        const userMatchMap = new Map<string, string>();
        for (const m of matches ?? []) {
          const otherId = m.user_a === uid ? m.user_b : m.user_a;
          if (!userMatchMap.has(otherId)) userMatchMap.set(otherId, m.id);
        }
        const lastByMatch = new Map<
          string,
          { body: string; created_at: string; sender_id: string }
        >();
        for (const m of allMsgs ?? [])
          if (!lastByMatch.has(m.match_id)) lastByMatch.set(m.match_id, m);

        setConnections(
          connData.map((c: any) => {
            const otherId = c.user_a === uid ? c.user_b : c.user_a;
            const p = profMap.get(otherId) ?? null;
            const matchId = userMatchMap.get(otherId) ?? null;
            const last = matchId ? lastByMatch.get(matchId) : null;
            const match = (matches ?? []).find((m) => m.id === matchId);
            return {
              id: c.id,
              otherId,
              otherName: p?.display_name ?? "Someone",
              otherAvatar: p?.avatar_emoji ?? "gradient-2",
              lastMessage: last?.body ?? null,
              lastMessageAt: last?.created_at ?? null,
              lastMessageMine: last?.sender_id === uid,
              lastIntent: match ? (sigMap.get(match.signal_id) ?? null) : null,
              matchId,
              createdAt: c.created_at,
            };
          }),
        );
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.error("Error loading matches:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("matches-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        load(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = rows.filter((r) =>
    tab === "active" ? r.isActive : tab === "recent" ? !r.isActive : true,
  );

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <header>
          <div className="flex items-center gap-2">
            <img src="/tlogo.svg" className="h-5 w-5 object-contain" alt="Flick Logo" />
            <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
              Flick
            </span>
            <div className="flex items-center gap-1.5 ml-1 rounded-full bg-surface-2 border border-border px-2 py-0.5">
              <MessageCircle className="h-3 w-3 text-warm" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Matches
              </span>
            </div>
          </div>
          <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
            Mutual <span className="italic text-warm">moments</span>.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Each active one disappears after 2 hours. Use them.
          </p>
        </header>

        <div className="mt-6 flex border-b border-border">
          {(
            [
              { k: "active", label: "Active" },
              { k: "recent", label: "Recent" },
              { k: "permanent", label: "Permanent" },
            ] as const
          ).map((t) => {
            const count =
              t.k === "active"
                ? rows.filter((r) => r.isActive).length
                : t.k === "recent"
                  ? rows.filter((r) => !r.isActive).length
                  : connections.length;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={cn(
                  "flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors",
                  tab === t.k
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1",
                      tab === t.k ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <ul className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </ul>
        ) : tab === "permanent" ? (
          <PermanentList rows={connections} />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-20 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              {tab === "active" ? (
                <MessageCircle className="h-9 w-9 text-muted-foreground" />
              ) : (
                <Clock className="h-9 w-9 text-muted-foreground" />
              )}
            </div>
            <h2 className="font-display mt-6 text-2xl">
              {tab === "active" ? "Nothing mutual yet." : "No recent matches."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "active"
                ? "When someone you waved at is open too, they'll appear here."
                : "Matches from the last 7 days appear here after their window closes."}
            </p>
          </motion.div>
        ) : (
          <ul className="mt-8 space-y-3">
            <AnimatePresence>
              {filtered.map((m, i) => {
                const intent = intentByKey(m.intent ?? "");
                const expiresIn = Math.max(0, new Date(m.expires_at).getTime() - Date.now());
                const mins = Math.floor(expiresIn / 60000);
                const isUrgent = m.isActive && mins < 10;
                const isWarning = m.isActive && mins < 30;

                return (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to="/match/$matchId"
                      params={{ matchId: m.id }}
                      className={cn(
                        "no-tap group flex items-center gap-4 rounded-3xl border bg-surface p-4 transition active:scale-[0.98]",
                        isUrgent
                          ? "border-destructive/30"
                          : isWarning
                            ? "border-warm/30"
                            : "border-border",
                      )}
                    >
                      <FlickAvatar
                        emoji={m.other?.avatar_emoji ?? "gradient-2"}
                        name={m.other?.display_name ?? "Someone"}
                        className={cn(
                          "h-14 w-14 rounded-2xl text-xl shrink-0",
                          m.isActive ? "warm-glow" : "opacity-60",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display truncate text-lg leading-tight">
                            {m.other?.display_name ?? "Someone"}
                          </h3>
                          <intent.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {m.last_message ?? `Open to ${intent.label.toLowerCase()} — say hi`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap">
                        {m.isActive ? (
                          <span
                            className={`font-mono ${isUrgent ? "text-destructive" : "text-warm"}`}
                          >
                            {mins}m left
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground">Ended</span>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-active:translate-x-0.5" />
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {pathname !== "/connections" && tab !== "permanent" && connections.length > 0 && (
          <Link
            to="/connections"
            className="no-tap mt-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" />
              {connections.length} permanent connection
              {connections.length === 1 ? "" : "s"}
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function PermanentList({ rows }: { rows: ConnectionRow[] }) {
  if (rows.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
          <Users className="h-9 w-9 text-muted-foreground" />
        </div>
        <h2 className="font-display mt-6 text-2xl">No permanent connections yet.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap "Keep in touch" on a match before the 2-hour window ends.
        </p>
      </motion.div>
    );
  }
  return (
    <ul className="mt-8 space-y-3">
      <AnimatePresence>
        {rows.map((c, i) => {
          const intent = c.lastIntent ? intentByKey(c.lastIntent) : null;
          const timeAgo = c.lastMessageAt
            ? (() => {
                const diff = Date.now() - new Date(c.lastMessageAt).getTime();
                const m = Math.floor(diff / 60000);
                if (m < 1) return "just now";
                if (m < 60) return `${m}m ago`;
                const h = Math.floor(m / 60);
                if (h < 24) return `${h}h ago`;
                const d = Math.floor(h / 24);
                return `${d}d ago`;
              })()
            : "no messages yet";
          return (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04 }}
            >
              {c.matchId ? (
                <Link
                  to="/match/$matchId"
                  params={{ matchId: c.matchId }}
                  className="no-tap flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 active:scale-[0.99]"
                >
                  <FlickAvatar
                    emoji={c.otherAvatar}
                    name={c.otherName}
                    className="h-14 w-14 shrink-0 rounded-2xl text-xl live-glow"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display truncate text-lg leading-tight">{c.otherName}</h3>
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Permanent
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                      {c.lastMessage ? (
                        <>
                          <span className="text-foreground/60">
                            {c.lastMessageMine ? "You: " : ""}
                          </span>
                          {c.lastMessage}
                        </>
                      ) : intent ? (
                        <>Met over {intent.label.toLowerCase()}</>
                      ) : (
                        "Tap to start the conversation"
                      )}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {timeAgo}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4">
                  <FlickAvatar
                    emoji={c.otherAvatar}
                    name={c.otherName}
                    className="h-14 w-14 shrink-0 rounded-2xl text-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display truncate text-lg leading-tight">{c.otherName}</h3>
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Permanent
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      {intent ? `Met over ${intent.label.toLowerCase()}` : "Connection"}
                    </p>
                  </div>
                </div>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
