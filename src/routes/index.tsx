import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      // Fetch user profile status
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_verified")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (profile && profile.age_verified) {
        localStorage.setItem("flick_onboarding_done", "true");
        throw redirect({ to: "/home" });
      } else {
        throw redirect({ to: "/setup" });
      }
    }

    // Unauthenticated user flow
    const onboardingDone = localStorage.getItem("flick_onboarding_done");
    if (!onboardingDone) {
      throw redirect({ to: "/onboarding" });
    }

    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
