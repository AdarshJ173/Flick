-- Update public.profiles SELECT policy to allow viewing any discoverable user profile

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Read profiles of active signals" ON public.profiles;

-- Create a clean policy that allows authenticated users to select discoverable profiles
CREATE POLICY "Read discoverable profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    discoverable = TRUE
    OR auth.uid() = id
  );
