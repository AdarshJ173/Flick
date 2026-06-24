import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { intentByKey } from "@/lib/intents";
import { MessageCircle, ArrowUpRight } from "lucide-react";

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
};

function MatchesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uid = u.user.id;
    const { data: matches } = await supabase
      .from("matches")
      .select("id,created_at,expires_at,user_a,user_b,signal_id")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!matches || matches.length === 0) { setRows([]); setLoading(false); return; }

    const otherIds = Array.from(new Set(matches.map(m => m.user_a === uid ? m.user_b : m.user_a)));
    const signalIds = Array.from(new Set(matches.map(m => m.signal_id)));

    const [{ data: profiles }, { data: signals }, { data: lasts }] = await Promise.all([
      supabase.from("profiles").select("id,display_name,avatar_emoji").in("id", otherIds),
      supabase.from("signals").select("id,intent").in("id", signalIds),
      supabase.from("messages").select("match_id,body,created_at").in("match_id", matches.map(m => m.id)).order("created_at", { ascending: false }),
    ]);

    const profMap = new Map((profiles ?? []).map(p => [p.id, p]));
    const sigMap = new Map((signals ?? []).map(s => [s.id, s.intent]));
    const lastMap = new Map<string, string>();
    for (const m of lasts ?? []) if (!lastMap.has(m.match_id)) lastMap.set(m.match_id, m.body);

    setRows(matches.map(m => {
      const otherId = m.user_a === uid ? m.user_b : m.user_a;
      const p = profMap.get(otherId) ?? null;
      return {
        ...m,
        other: p,
        intent: sigMap.get(m.signal_id) ?? null,
        last_message: lastMap.get(m.id) ?? null,
      };
    }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase.channel("matches-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-warm" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Matches</span>
          </div>
          <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
            Mutual <span className="italic text-warm">moments</span>.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Each one disappears after 2 hours. Use them.</p>
        </header>

        {loading ? (
          <ul className="mt-8 space-y-3">
            {[0,1].map(i => <li key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />)}
          </ul>
        ) : rows.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              <MessageCircle className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="font-display mt-6 text-2xl">Nothing mutual yet.</h2>
            <p className="mt-2 text-sm text-muted-foreground">When someone you waved at is open too, they'll appear here.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((m, i) => {
              const intent = intentByKey(m.intent ?? "");
              const expiresIn = Math.max(0, new Date(m.expires_at).getTime() - Date.now());
              const mins = Math.floor(expiresIn / 60000);
              return (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to="/match/$matchId" params={{ matchId: m.id }}
                    className="no-tap group flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 transition active:scale-[0.98]"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-3xl warm-glow">
                      {m.other?.avatar_emoji ?? "✨"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display truncate text-lg leading-tight">{m.other?.display_name ?? "Someone"}</h3>
                        <span className="text-sm">{intent.emoji}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {m.last_message ?? `Open to ${intent.label.toLowerCase()} — say hi`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <span className="font-mono text-warm">{mins}m left</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-active:translate-x-0.5" />
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
