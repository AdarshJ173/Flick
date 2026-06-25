import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Check if profile setup is complete (age_verified is true)
    const { data: profile } = await supabase
      .from("profiles")
      .select("age_verified")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile || !profile.age_verified) {
      throw redirect({ to: "/setup" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
