import { Link, useRouterState } from "@tanstack/react-router";
import { Radio, Users, MessageCircle, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/home", label: "Live", icon: Radio },
    { to: "/nearby", label: "Nearby", icon: Users },
    { to: "/matches", label: "Matches", icon: MessageCircle },
    { to: "/profile", label: "You", icon: UserRound },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="glass no-tap flex items-center justify-around rounded-2xl px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium tracking-wide uppercase transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
              {active && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
