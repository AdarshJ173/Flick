import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { ArrowLeft, UserX, UserCheck } from "lucide-react";
import { FlickAvatar } from "@/components/flick/avatar";

export const Route = createFileRoute("/_authenticated/blocked")({
  component: BlockedUsersPage,
});

type BlockedUser = {
  blocked_id: string;
  display_name: string;
  avatar_emoji: string;
  blocked_at: string;
};

function BlockedUsersPage() {
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  async function load() {
    try {
      const { data, error } = await supabase.rpc("get_blocked_users" as any);
      if (error) throw error;
      setBlocked((data as BlockedUser[]) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function unblock(userId: string, name: string) {
    setUnblocking(userId);
    try {
      const { error } = await supabase.rpc("unblock_user" as any, { in_blocked_id: userId });
      if (error) throw error;
      setBlocked((prev) => prev.filter((b) => b.blocked_id !== userId));
      toast.success(`${name} unblocked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="no-tap -m-2 rounded-full p-2 text-muted-foreground active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Safety
            </span>
            <h1 className="font-display mt-1 text-3xl leading-none tracking-tight">Blocked</h1>
          </div>
        </header>

        <p className="mt-3 text-sm text-muted-foreground">
          Blocked people cannot see your signals and you cannot see theirs.
        </p>

        {loading ? (
          <ul className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </ul>
        ) : blocked.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-24 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              <UserX className="h-9 w-9 text-muted-foreground/40" />
            </div>
            <h2 className="font-display mt-6 text-2xl">No blocked users.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Everyone you block appears here and cannot interact with you.
            </p>
          </motion.div>
        ) : (
          <ul className="mt-6 space-y-3">
            <AnimatePresence initial={false}>
              {blocked.map((b, i) => (
                <motion.li
                  key={b.blocked_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4"
                >
                  <FlickAvatar
                    emoji={b.avatar_emoji}
                    name={b.display_name}
                    className="h-12 w-12 rounded-2xl text-lg shrink-0 opacity-60"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display truncate text-base leading-tight text-foreground/70">
                      {b.display_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground/60">
                      Blocked · {new Date(b.blocked_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => unblock(b.blocked_id, b.display_name)}
                    disabled={unblocking === b.blocked_id}
                    className="no-tap flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 text-xs font-medium text-muted-foreground transition active:scale-95 disabled:opacity-40"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {unblocking === b.blocked_id ? "…" : "Unblock"}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </AppShell>
  );
}
