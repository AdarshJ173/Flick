import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { LogOut, Check, Settings } from "lucide-react";
import { cn, getAvatarStyle } from "@/lib/utils";

const EMOJI_CHOICES = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "gradient-6",
];

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [vibe, setVibe] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name,avatar_emoji,vibe")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p) {
        setName(p.display_name);
        setEmoji(p.avatar_emoji);
        setVibe(p.vibe ?? "");
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || "Someone",
        avatar_emoji: emoji,
        vibe: vibe.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header className="flex justify-between items-start">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Profile
            </div>
            <h1 className="font-display mt-2 text-4xl leading-none tracking-tight">
              The you <span className="italic text-primary">people see</span>.
            </h1>
          </div>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="no-tap -m-2 rounded-full p-2 text-muted-foreground hover:text-foreground active:scale-90"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>
        <p className="mt-2 text-sm text-muted-foreground">
          Only revealed to people you both said yes to.
        </p>

        <div className="mt-8 flex items-center gap-5">
          <div className={cn("flex h-20 w-20 items-center justify-center rounded-3xl text-3xl shadow-sm transition-all duration-300", getAvatarStyle(emoji))}>
            {name.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Avatar Theme
            </div>
            <div className="mt-2 -mx-1 overflow-x-auto [scrollbar-width:none]">
              <div className="flex gap-2 px-1">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "no-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm transition active:scale-90",
                      getAvatarStyle(e),
                      e === emoji ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    )}
                  >
                    {name.charAt(0).toUpperCase() || "?"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Field label="First name" value={name} onChange={setName} placeholder="Riya" />
          <Field
            label="Your vibe (one line)"
            value={vibe}
            onChange={setVibe}
            placeholder="Always down for a long walk and weird ideas."
          />
          <Field label="Email" value={email} onChange={() => {}} disabled />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="no-tap mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Check className="h-4 w-4" /> Save
            </>
          )}
        </button>

        <button
          onClick={signOut}
          className="no-tap mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium text-muted-foreground active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
    </label>
  );
}
