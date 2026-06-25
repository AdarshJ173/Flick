-- Recreate public.signals SELECT policy to be recursion-free (removing query to profiles table)
DROP POLICY IF EXISTS "Read active signals of discoverable users" ON public.signals;
CREATE POLICY "Read active signals of discoverable users"
  ON public.signals FOR SELECT TO authenticated
  USING (
    active = TRUE
    AND expires_at > now()
  );
