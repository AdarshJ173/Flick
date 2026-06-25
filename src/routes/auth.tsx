import { createFileRoute, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_verified")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (profile && profile.age_verified) {
        throw redirect({ to: "/home" });
      } else {
        throw redirect({ to: "/setup" });
      }
    }
  },
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const postAuthTarget = redirect && redirect.startsWith("/") ? redirect : "/home";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + postAuthTarget,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("You're in. Welcome.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: postAuthTarget as "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const target = window.location.origin + postAuthTarget;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: target,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient atmosphere */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-warm/15 blur-[110px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2">
            <img src="/tlogo.svg" className="h-6 w-6 object-contain" alt="Flick Logo" />
            <span className="text-xs font-mono tracking-[0.18em] uppercase text-muted-foreground">
              Flick
            </span>
          </div>
          <h1 className="font-display mt-8 text-[clamp(2.5rem,9vw,3.75rem)] leading-[0.95] tracking-tight text-foreground">
            Be here.
            <br />
            <span className="italic text-primary">Find people.</span>
          </h1>
          <p className="mt-4 max-w-[28ch] text-base text-muted-foreground">
            Broadcast that you're here and open. People nearby who said yes too show up. No
            rejection. No profiles to swipe.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 space-y-3"
        >
          {mode === "signup" && (
            <Field
              label="Your first name"
              value={name}
              onChange={setName}
              placeholder="Riya"
              autoComplete="given-name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@somewhere.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="no-tap mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "…" : mode === "signup" ? "Start" : "Sign in"}
          </button>

          <div className="flex items-center gap-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="no-tap flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-sm font-medium text-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleMark /> Continue with Google
          </button>
        </motion.form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mx-auto mt-10 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <span className="text-primary">{mode === "signup" ? "Sign in" : "Create one"}</span>
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="group block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        {...rest}
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M21.8 10.2H12v3.8h5.6c-.6 2.6-2.8 4-5.6 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.5 0 2.9.6 4 1.5l2.7-2.7C16.9 3.2 14.6 2.2 12 2.2 6.5 2.2 2 6.7 2 12.2s4.5 10 10 10c5.7 0 9.8-4 9.8-10 0-.7-.1-1.4-.2-2z"
      />
      <path
        fill="#FF3D00"
        d="M3.2 7.3l3.2 2.4C7.3 7.7 9.5 6.2 12 6.2c1.5 0 2.9.6 4 1.5l2.7-2.7C16.9 3.2 14.6 2.2 12 2.2 8.2 2.2 4.9 4.3 3.2 7.3z"
      />
      <path
        fill="#4CAF50"
        d="M12 22.2c2.6 0 4.9-1 6.6-2.6l-3-2.5c-.9.7-2.1 1.1-3.6 1.1-2.8 0-5-1.8-5.7-4.3l-3.2 2.5c1.6 3.2 4.9 5.8 8.9 5.8z"
      />
      <path
        fill="#1976D2"
        d="M21.8 10.2H12v3.8h5.6c-.3 1.3-1 2.4-2 3.2l3 2.5c-.2.2 3.4-2.4 3.4-7.5 0-.7-.1-1.4-.2-2z"
      />
    </svg>
  );
}
