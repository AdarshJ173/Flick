import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, BellOff, Bell, Ban, Flag, Loader2, CheckCircle2, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FlickAvatar } from "@/components/flick/avatar";
import { intentByKey, type Intent } from "@/lib/intents";
import { cn } from "@/lib/utils";

export type ChatProfileUser = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  vibe: string | null;
  interests: string[] | null;
  photo_verified?: boolean;
  age_verified?: boolean;
  place_label: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: ChatProfileUser | null;
  intent: Intent | null;
  matchId: string;
  currentUserId: string;
  onBlocked: () => void;
};

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Inappropriate content",
  "Impersonation",
  "Other",
] as const;

export function ChatProfileSheet({
  open,
  onOpenChange,
  user,
  intent,
  matchId,
  currentUserId,
  onBlocked,
}: Props) {
  const [muted, setMuted] = useState(false);
  const [togglingMute, setTogglingMute] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]>(
    REPORT_REASONS[0],
  );
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);

  async function loadMuteState() {
    if (!user || !matchId) return;
    const { data } = await (supabase as any)
      .from("match_mutes")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setMuted(!!data);
  }

  async function toggleMute() {
    if (!user) return;
    setTogglingMute(true);
    try {
      if (muted) {
        const { error } = await (supabase as any)
          .from("match_mutes")
          .delete()
          .eq("match_id", matchId)
          .eq("user_id", currentUserId);
        if (error) throw error;
        setMuted(false);
        toast.success("Unmuted.");
      } else {
        const { error } = await (supabase as any)
          .from("match_mutes")
          .insert({ match_id: matchId, user_id: currentUserId });
        if (error) throw error;
        setMuted(true);
        toast.success("Muted. You won't be notified.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update mute");
    } finally {
      setTogglingMute(false);
    }
  }

  async function submitReport() {
    if (!user) return;
    setSubmittingReport(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUserId,
        reported_id: user.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      if (error) throw error;
      toast.success("Report sent. Our team will review.");
      setShowReport(false);
      setReportDetails("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send report");
    } finally {
      setSubmittingReport(false);
    }
  }

  async function block() {
    if (!user) return;
    setBlocking(true);
    try {
      const { error: blockErr } = await supabase.rpc("block_user", {
        in_blocked_id: user.id,
      });
      if (blockErr) throw blockErr;
      await supabase.from("reports").insert({
        reporter_id: currentUserId,
        reported_id: user.id,
        reason: "User blocked from chat profile",
      });
      await supabase.from("matches").delete().eq("id", matchId);
      toast.success("User blocked.");
      setShowBlockConfirm(false);
      onOpenChange(false);
      onBlocked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't block user");
    } finally {
      setBlocking(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border bg-background p-0 max-h-[88vh] overflow-y-auto"
        onOpenAutoFocus={() => {
          if (user) loadMuteState();
        }}
      >
        {user ? (
          <div className="px-6 pb-8 pt-2">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader className="items-center text-center">
              <FlickAvatar
                emoji={user.avatar_emoji}
                name={user.display_name}
                className="h-20 w-20 rounded-3xl text-3xl live-glow"
              />
              <SheetTitle className="mt-3 font-display text-2xl">{user.display_name}</SheetTitle>
              {intent && (
                <SheetDescription className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <intent.icon className="h-3.5 w-3.5" />
                  Open to {intent.label.toLowerCase()}
                </SheetDescription>
              )}
              {user.place_label && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {user.place_label}
                </p>
              )}
            </SheetHeader>

            {/* Verification badges */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {user.photo_verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="h-3 w-3" /> Photo
                </span>
              )}
              {user.age_verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="h-3 w-3" /> 18+
                </span>
              )}
            </div>

            {user.vibe && (
              <p className="mt-5 text-center text-sm leading-relaxed text-foreground/90">
                "{user.vibe}"
              </p>
            )}

            {user.interests && user.interests.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {user.interests.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 space-y-2">
              <SheetAction
                icon={muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                label={muted ? "Unmute conversation" : "Mute conversation"}
                onClick={toggleMute}
                disabled={togglingMute}
              />
              <SheetAction
                icon={<Flag className="h-4 w-4" />}
                label="Report"
                onClick={() => setShowReport(true)}
              />
              <SheetAction
                icon={<Ban className="h-4 w-4" />}
                label="Block"
                destructive
                onClick={() => setShowBlockConfirm(true)}
              />
            </div>

            <p className="mt-6 text-center text-[10px] text-muted-foreground/60">
              Blocking ends the conversation and hides you from each other.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </SheetContent>

      {/* Report dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Report {user?.display_name}</DialogTitle>
            <DialogDescription>
              Reports are reviewed by our safety team. We never tell the other person you reported
              them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={cn(
                    "no-tap rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95",
                    reportReason === r
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value.slice(0, 600))}
              placeholder="Add context (optional)"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm focus:border-primary/40 focus:outline-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReport(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={submittingReport}>
              {submittingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirmation dialog */}
      <AnimatePresence>
        {showBlockConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
            onClick={() => !blocking && setShowBlockConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg">Block {user?.display_name}?</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                They'll be removed from your matches, you won't see each other's signals, and this
                conversation will be deleted. You can unblock from Settings anytime.
              </p>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBlockConfirm(false)}
                  disabled={blocking}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={block}
                  disabled={blocking}
                >
                  {blocking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Block"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "no-tap flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-60",
        destructive
          ? "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-surface text-foreground hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          destructive ? "bg-destructive/10" : "bg-surface-2",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
