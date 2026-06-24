-- =========================================
-- connections (permanent connections)
-- =========================================
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a <> user_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own connections"
  ON public.connections FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- =========================================
-- match_keep_in_touch (keep in touch status)
-- =========================================
CREATE TABLE IF NOT EXISTS public.match_keep_in_touch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_keep_in_touch TO authenticated;
GRANT ALL ON public.match_keep_in_touch TO service_role;
ALTER TABLE public.match_keep_in_touch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own keep in touch decisions"
  ON public.match_keep_in_touch FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Matched users can read keep in touch decisions"
  ON public.match_keep_in_touch FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_keep_in_touch.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- =========================================
-- Trigger/Function: Promote to Connection
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_keep_in_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_a UUID;
  v_user_b UUID;
  v_match_id UUID := NEW.match_id;
  v_count INT;
BEGIN
  -- Get the users involved in this match
  SELECT user_a, user_b INTO v_user_a, v_user_b
  FROM public.matches
  WHERE id = v_match_id;

  -- Check how many users have opted in to keep in touch for this match
  SELECT count(*) INTO v_count
  FROM public.match_keep_in_touch
  WHERE match_id = v_match_id;

  -- If both have opted in, create the permanent connection record
  IF v_count = 2 THEN
    INSERT INTO public.connections (user_a, user_b)
    VALUES (LEAST(v_user_a, v_user_b), GREATEST(v_user_a, v_user_b))
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_keep_in_touch_created ON public.match_keep_in_touch;
CREATE TRIGGER on_keep_in_touch_created
  AFTER INSERT ON public.match_keep_in_touch
  FOR EACH ROW EXECUTE FUNCTION public.handle_keep_in_touch();

-- =========================================
-- Relax Message RLS Policies for Permanent Connections
-- =========================================
DROP POLICY IF EXISTS "Matched users read messages" ON public.messages;
CREATE POLICY "Matched users read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      LEFT JOIN public.connections c ON 
        (c.user_a = LEAST(m.user_a, m.user_b) AND c.user_b = GREATEST(m.user_a, m.user_b))
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
        AND (m.expires_at > now() OR c.id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Matched users send messages" ON public.messages;
CREATE POLICY "Matched users send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      LEFT JOIN public.connections c ON 
        (c.user_a = LEAST(m.user_a, m.user_b) AND c.user_b = GREATEST(m.user_a, m.user_b))
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
        AND (m.expires_at > now() OR c.id IS NOT NULL)
    )
  );
