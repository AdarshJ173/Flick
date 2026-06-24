import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/flick/app-shell";
import { ArrowLeft, Shield, Bell, Eye, EyeOff, Trash2, LogOut, ChevronRight, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [discoverable, setDiscoverable] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a full production implementation, load user discovery preferences here.
    // For now, we seed with sensible defaults.
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  async function handleDeleteAccount() {
    const confirm = window.confirm("Are you absolutely sure you want to delete your account? This action is permanent and compliant with GDPR.");
    if (!confirm) return;

    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      
      const { error } = await supabase.from("profiles").delete().eq("id", u.user.id);
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success("Account deleted successfully.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="no-tap -m-2 rounded-full p-2 text-muted-foreground active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Configure
            </span>
            <h1 className="font-display mt-1 text-3xl leading-none tracking-tight">
              Settings
            </h1>
          </div>
        </header>

        <div className="mt-8 space-y-6">
          {/* Privacy Section */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Privacy & Visibility
            </h2>
            <div className="rounded-3xl border border-border bg-surface p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {discoverable ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    Discoverable
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[22ch]">
                    Allow others nearby to discover your active signals.
                  </p>
                </div>
                <Switch
                  checked={discoverable}
                  onCheckedChange={(checked) => {
                    setDiscoverable(checked);
                    toast.success(checked ? "You are now discoverable nearby" : "You are now completely hidden");
                  }}
                />
              </div>

              <div className="h-px bg-border/50" />

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">Max Proximity Radius</span>
                  <span className="font-mono text-primary font-medium">{radius}m</span>
                </div>
                <Slider
                  min={500}
                  max={3000}
                  step={100}
                  value={[radius]}
                  onValueChange={(val) => setRadius(val[0])}
                  className="py-2"
                />
                <p className="text-[10px] text-muted-foreground">
                  Limit matching and signaling to within this geographic range.
                </p>
              </div>
            </div>
          </section>

          {/* Guidelines Section */}
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> Safety & Legal
            </h2>
            <div className="rounded-3xl border border-border bg-surface divide-y divide-border/50 overflow-hidden">
              <button
                onClick={() => toast.info("Rules: 1. Keep it real. 2. Respect physical boundaries. 3. Safety first.")}
                className="no-tap w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/10 transition active:scale-[0.99]"
              >
                <span className="text-sm font-medium text-foreground">Community Guidelines</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => toast.info("Privacy Policy: All signals expire after 90 minutes. Absolute spatial anonymity guaranteed.")}
                className="no-tap w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/10 transition active:scale-[0.99]"
              >
                <span className="text-sm font-medium text-foreground">Privacy Policy & Terms</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Account Actions / Danger Zone */}
          <section className="space-y-3 pt-4">
            <button
              onClick={handleSignOut}
              className="no-tap w-full flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="no-tap w-full flex h-14 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
