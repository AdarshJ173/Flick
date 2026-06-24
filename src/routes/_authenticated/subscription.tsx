import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Zap,
  MapPin,
  Clock,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
});

type Tier = "monthly" | "annual" | "credits";

function SubscriptionPage() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<Tier>("annual");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"method" | "processing" | "success">("method");
  const [selectedUPI, setSelectedUPI] = useState<string>("gpay");

  // Load subscription state from localStorage on mount
  useEffect(() => {
    const subState = localStorage.getItem("flick_plus_active") === "true";
    setIsSubscribed(subState);
  }, []);

  const handleSubscribe = () => {
    setShowCheckout(true);
    setPaymentStep("method");
  };

  const processPayment = () => {
    setPaymentStep("processing");
    setTimeout(() => {
      setPaymentStep("success");
      localStorage.setItem("flick_plus_active", "true");
      setIsSubscribed(true);
      toast.success("Welcome to Flick Plus!");
    }, 2200);
  };

  const handleCancelSubscription = () => {
    if (window.confirm("Are you sure you want to cancel your Flick Plus subscription?")) {
      localStorage.removeItem("flick_plus_active");
      setIsSubscribed(false);
      toast.success("Subscription cancelled successfully.");
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background text-foreground">
      {/* Scrollable content area with bottom padding for sticky bar */}
      <main className="flex-1 px-5 pt-12 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="no-tap -m-2 rounded-full p-2 text-muted-foreground active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Monetization
            </span>
            <h1 className="font-display mt-1 text-3xl leading-none tracking-tight flex items-center gap-2">
              Flick Plus <Sparkles className="h-5 w-5 text-primary fill-primary/20" />
            </h1>
          </div>
        </header>

        {isSubscribed ? (
          /* Active Subscription State */
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Your Subscription is Active</h2>
                <p className="text-sm text-muted-foreground">
                  Enjoying unlimited signals, radius control, and premium insights.
                </p>
              </div>
              <div className="font-mono text-xs text-primary/80 border border-primary/20 rounded-xl py-2 px-4 bg-primary/5 inline-block">
                Auto-renews on July 24, 2026
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Plus Benefits Active
              </h3>
              <div className="space-y-3">
                <BenefitItem text="Unlimited proximity signals (No limits)" />
                <BenefitItem text="Radius Precision Control enabled" />
                <BenefitItem text="Interactive Signal Replay analytics" />
                <BenefitItem text="Extended 3-hour match windows" />
                <BenefitItem text="Priority discovery matching queue" />
                <BenefitItem text="Unlimited connection messaging" />
              </div>
            </div>

            <button
              onClick={handleCancelSubscription}
              className="no-tap w-full flex h-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 text-sm font-semibold text-destructive active:scale-[0.98] transition"
            >
              Cancel Subscription
            </button>
          </div>
        ) : (
          /* Subscription Sales State */
          <div className="mt-8 space-y-8">
            {/* Value Statement */}
            <div className="space-y-2">
              <p className="font-display text-2xl leading-tight text-foreground">
                Some people walk into a room and the{" "}
                <span className="italic text-primary">room changes</span>. They are just open.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlock Flick Plus to remove constraints on your proximity connections. Elevate how
                you discover and connect with those nearby.
              </p>
            </div>

            {/* Premium Tier Options */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Select Your Plan
              </h3>

              {/* Annual Plan Option */}
              <div
                onClick={() => setSelectedTier("annual")}
                className={`no-tap relative cursor-pointer rounded-3xl border p-5 transition-all duration-300 ${
                  selectedTier === "annual"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                  Best Value — Save 44%
                </div>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      Flick Plus Annual{" "}
                      <Check
                        className={`h-4 w-4 text-primary ${selectedTier === "annual" ? "opacity-100" : "opacity-0"}`}
                      />
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Unlimited signals for 12 months. Paid once.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold">₹999</div>
                    <div className="text-[10px] text-muted-foreground">₹83/month equiv.</div>
                  </div>
                </div>
              </div>

              {/* Monthly Plan Option */}
              <div
                onClick={() => setSelectedTier("monthly")}
                className={`no-tap cursor-pointer rounded-3xl border p-5 transition-all duration-300 ${
                  selectedTier === "monthly"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      Flick Plus Monthly{" "}
                      <Check
                        className={`h-4 w-4 text-primary ${selectedTier === "monthly" ? "opacity-100" : "opacity-0"}`}
                      />
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Rolling subscription, cancel anytime.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold">₹149</div>
                    <div className="text-[10px] text-muted-foreground">per month</div>
                  </div>
                </div>
              </div>

              {/* Signal Credits option */}
              <div
                onClick={() => setSelectedTier("credits")}
                className={`no-tap cursor-pointer rounded-3xl border p-5 transition-all duration-300 ${
                  selectedTier === "credits"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      3 Signal Credits Pack{" "}
                      <Check
                        className={`h-4 w-4 text-primary ${selectedTier === "credits" ? "opacity-100" : "opacity-0"}`}
                      />
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Radius Boost & Spotlight. No subscription needed.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold">₹49</div>
                    <div className="text-[10px] text-muted-foreground">one-time payment</div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Features detail */}
            <div className="rounded-3xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Features Included
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-foreground">Unlimited Signals</h5>
                    <p className="mt-0.5">
                      Broadcast signals without monthly caps. Be discoverable whenever you are out.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-foreground">Radius Precision Control</h5>
                    <p className="mt-0.5">
                      Granularly adjust your discovery range (500m, 1km, 2km) to match your
                      surroundings.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-foreground">Extended Match Windows</h5>
                    <p className="mt-0.5">
                      Keep temporary connections active for up to 3 hours instead of the standard 90
                      minutes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-foreground">Unlimited Messaging</h5>
                    <p className="mt-0.5">
                      Exchange messages freely with all your permanent connections without daily
                      limitations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Cancel subscription anytime with one click from
              settings.
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Nav Bar containing the primary action button */}
      {!isSubscribed && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="glass rounded-2xl p-3 flex flex-col gap-2">
            <button
              onClick={handleSubscribe}
              className="no-tap flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] cursor-pointer shadow-lg shadow-primary/20"
            >
              {selectedTier === "credits" ? (
                <>Buy Credits for ₹49</>
              ) : selectedTier === "annual" ? (
                <>Unlock Annual Plus for ₹999</>
              ) : (
                <>Get Plus Monthly for ₹149</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Premium simulated UPI Razorpay drawer */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md rounded-t-[2rem] bg-surface border-t border-border p-6 pb-[max(env(safe-area-inset-bottom),24px)] space-y-6"
            >
              {/* Drawer Handle */}
              <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />

              {paymentStep === "method" && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
                        Secure Checkout
                      </span>
                      <h3 className="font-display text-2xl tracking-tight mt-1 text-foreground">
                        Pay with UPI
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Amount</span>
                      <span className="font-mono text-lg font-bold text-primary">
                        {selectedTier === "annual"
                          ? "₹999.00"
                          : selectedTier === "monthly"
                            ? "₹149.00"
                            : "₹49.00"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Select UPI App
                    </h4>

                    {/* Google Pay */}
                    <UPIOption
                      id="gpay"
                      name="Google Pay"
                      selected={selectedUPI === "gpay"}
                      onClick={() => setSelectedUPI("gpay")}
                    />

                    {/* PhonePe */}
                    <UPIOption
                      id="phonepe"
                      name="PhonePe"
                      selected={selectedUPI === "phonepe"}
                      onClick={() => setSelectedUPI("phonepe")}
                    />

                    {/* Paytm */}
                    <UPIOption
                      id="paytm"
                      name="Paytm"
                      selected={selectedUPI === "paytm"}
                      onClick={() => setSelectedUPI("paytm")}
                    />

                    {/* BHIM UPI */}
                    <UPIOption
                      id="bhim"
                      name="BHIM UPI"
                      selected={selectedUPI === "bhim"}
                      onClick={() => setSelectedUPI("bhim")}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="no-tap flex-1 h-12 rounded-xl border border-border text-xs font-semibold text-muted-foreground transition active:scale-[0.97]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processPayment}
                      className="no-tap flex-2 h-12 rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition active:scale-[0.97]"
                    >
                      Pay via UPI
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Powered by Razorpay secure
                    checkout.
                  </p>
                </>
              )}

              {paymentStep === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Verifying payment…</h3>
                    <p className="text-xs text-muted-foreground">
                      Confirming your transaction with the selected UPI network.
                    </p>
                  </div>
                </div>
              )}

              {paymentStep === "success" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-5 text-center">
                  <CheckCircle2 className="h-14 w-14 text-primary animate-bounce" />
                  <div className="space-y-1">
                    <h3 className="font-display text-3xl text-foreground">
                      {selectedTier === "credits" ? "Credits Added!" : "You're in the Club!"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedTier === "credits"
                        ? "Credits have been loaded to your account."
                        : "Your Flick Plus subscription is now active."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      navigate({ to: "/profile" });
                    }}
                    className="no-tap w-full h-12 rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition active:scale-[0.97]"
                  >
                    Go Back to Profile
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/90">
      <Check className="h-4 w-4 text-primary shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function UPIOption({
  id,
  name,
  selected,
  onClick,
}: {
  id: string;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`no-tap flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-xs font-bold ${selected ? "text-primary border border-primary/30" : "text-muted-foreground border border-border"}`}
        >
          {id === "gpay" && <Smartphone className="h-4 w-4" />}
          {id === "phonepe" && <CreditCard className="h-4 w-4" />}
          {id === "paytm" && <QrCode className="h-4 w-4" />}
          {id === "bhim" && <Sparkles className="h-4 w-4" />}
        </div>
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      <div
        className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${selected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"}`}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
  );
}
