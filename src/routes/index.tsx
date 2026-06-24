import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const onboardingDone = localStorage.getItem("flick_onboarding_done");
    if (!onboardingDone) {
      throw redirect({ to: "/onboarding" });
    }

    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/home" : "/auth" });
  },
  component: () => null,
});
