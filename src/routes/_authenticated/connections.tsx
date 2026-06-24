import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { Users, MessageSquare, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlickAvatar } from "@/components/flick/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/connections")({
  component: ConnectionsPage,
});

type ConnectionRow = {
  id: string;
  created_at: string;
  otherUser: {
    id: string;
    display_name: string;
    avatar_emoji: string;
    vibe: string | null;
  };
  matchId: string | null;
};

function ConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      // 1. Fetch connections
      const { data: connData, error: connError } = await (supabase as any)
        .from("connections")
        .select("id,created_at,user_a,user_b")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("created_at", { ascending: false });

      if (connError) throw connError;
      if (!connData || connData.length === 0) {
        setConnections([]);
        return;
      }

      // 2. Extract other user IDs
      const otherUserIds = connData.map((c: any) => (c.user_a === uid ? c.user_b : c.user_a));

      // 3. Fetch profiles and latest matches for these users to open chat
      const [{ data: profiles }, { data: matches }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,avatar_emoji,vibe")
          .in("id", otherUserIds),
        supabase
          .from("matches")
          .select("id,user_a,user_b")
          .or(`user_a.eq.${uid},user_b.eq.${uid}`)
          .order("created_at", { ascending: false }),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      // Match lookup by other user id
      const userMatchMap = new Map<string, string>();
      if (matches) {
        for (const m of matches) {
          const otherId = m.user_a === uid ? m.user_b : m.user_a;
          if (!userMatchMap.has(otherId)) {
            userMatchMap.set(otherId, m.id);
          }
        }
      }

      setConnections(
        connData.map((c: any) => {
          const otherId = c.user_a === uid ? c.user_b : c.user_a;
          const p = profileMap.get(otherId) ?? {
            id: otherId,
            display_name: "Someone",
            avatar_emoji: "gradient-1",
            vibe: null,
          };
          return {
            id: c.id,
            created_at: c.created_at,
            otherUser: p,
            matchId: userMatchMap.get(otherId) ?? null,
          };
        }),
      );
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

  return (
    <AppShell>
      <div className="px-5 pt-12">
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
            People you've both chosen to stay in touch with permanently.
          </p>
        </header>

        {loading ? (
          <ul className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-surface"
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
            {connections.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 transition">
                  <FlickAvatar
                    emoji={c.otherUser.avatar_emoji}
                    name={c.otherUser.display_name}
                    className="h-14 w-14 rounded-2xl text-xl shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display truncate text-lg leading-tight">
                      {c.otherUser.display_name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.otherUser.vibe || "No bio added yet."}
                    </p>
                  </div>
                  {c.matchId && (
                    <Link
                      to="/match/$matchId"
                      params={{ matchId: c.matchId }}
                      className="no-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition"
                    >
                      <MessageSquare className="h-4.5 w-4.5" />
                    </Link>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
