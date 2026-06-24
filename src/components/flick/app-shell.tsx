import { Link, useRouterState } from "@tanstack/react-router";
import { Radio, Users, MessageCircle, UserRound, Compass } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { PwaInstallPrompt } from "@/components/flick/pwa-install-prompt";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="container-page relative flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
      <PwaInstallPrompt />
    </div>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const direction = useScrollDirection();
  const hidden = direction === "down";

  const items = [
    { to: "/home", label: "Live", icon: Radio },
    { to: "/discover", label: "Radar", icon: Compass },
    { to: "/nearby", label: "Nearby", icon: Users },
    { to: "/matches", label: "Matches", icon: MessageCircle },
    { to: "/profile", label: "You", icon: UserRound },
  ] as const;

  return (
    <nav
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] transition-transform duration-200 ease-out",
        hidden ? "translate-y-28 opacity-0" : "translate-y-0 opacity-100",
      )}
      aria-hidden={hidden}
    >
      <div className="no-tap pointer-events-auto flex w-full max-w-[24rem] items-center justify-around rounded-2xl border border-border bg-surface px-3 py-2 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
              {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
