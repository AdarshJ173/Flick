import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { intentByKey } from "@/lib/intents";
import { MessageCircle, ArrowUpRight, Clock } from "lucide-react";
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
  isActive: boolean;
};

type TabKey = "active" | "recent";

function MatchesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("active");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function load() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      // Fetch all matches from the last 7 days
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: matches } = await supabase
        .from("matches")
        .select("id,created_at,expires_at,user_a,user_b,signal_id")
        .gt("created_at", since)
        .order("created_at", { ascending: false });

      if (!matches || matches.length === 0) {
        setRows([]);
        return;
      }

      const otherIds = Array.from(
        new Set(matches.map((m) => (m.user_a === uid ? m.user_b : m.user_a))),
      );
      const signalIds = Array.from(new Set(matches.map((m) => m.signal_id)));

      const [{ data: profiles }, { data: signals }, { data: lasts }] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_emoji").in("id", otherIds),
        supabase.from("signals").select("id,intent").in("id", signalIds),
        supabase
          .from("messages")
          .select("match_id,body,created_at")
          .in(
            "match_id",
            matches.map((m) => m.id),
          )
          .order("created_at", { ascending: false }),
      ]);

      const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const sigMap = new Map((signals ?? []).map((s) => [s.id, s.intent]));
      const lastMap = new Map<string, string>();
      for (const m of lasts ?? []) if (!lastMap.has(m.match_id)) lastMap.set(m.match_id, m.body);

      const now = new Date().toISOString();
      setRows(
        matches.map((m) => {
          const otherId = m.user_a === uid ? m.user_b : m.user_a;
          const p = profMap.get(otherId) ?? null;
          return {
            ...m,
            other: p,
            intent: sigMap.get(m.signal_id) ?? null,
            last_message: lastMap.get(m.id) ?? null,
            isActive: m.expires_at > now,
          };
        }),
      );
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = rows.filter((r) => (tab === "active" ? r.isActive : !r.isActive));

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-warm" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Matches
            </span>
          </div>
          <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
            Mutual <span className="italic text-warm">moments</span>.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Each one disappears after 2 hours. Use them.
          </p>
        </header>

        {/* Tab switcher */}
        <div className="mt-6 flex border-b border-border">
          {(["active", "recent"] as const).map((t) => {
            const count = rows.filter((r) => (t === "active" ? r.isActive : !r.isActive)).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors",
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {t === "active" ? "Active" : "Recent"}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1",
                      tab === t ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <Link
            to="/connections"
            className={cn(
              "flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors",
              pathname === "/connections"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground",
            )}
          >
            Permanent
          </Link>
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
                            className={`font-mono ${isUrgent ? "text-destructive" : isWarning ? "text-warm" : "text-warm"}`}
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
      </div>
    </AppShell>
  );
}
