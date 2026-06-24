-- =====================================================
-- Flick persistence: mutes, reactions, connection notes,
-- last-active heartbeat. Idempotent — safe to re-run.
-- =====================================================

-- profiles.last_active_at — updated on app open / message send
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- connections.notes — private notes the user keeps about a connection
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- =========================================
-- match_mutes (per-user mute of a match thread)
-- =========================================
CREATE TABLE IF NOT EXISTS public.match_mutes (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.match_mutes TO authenticated;
GRANT ALL ON public.match_mutes TO service_role;
ALTER TABLE public.match_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own mutes"
  ON public.match_mutes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================
-- message_reactions (lightweight emoji reactions)
-- =========================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matched users read reactions"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages msg
      JOIN public.matches m ON m.id = msg.match_id
      WHERE msg.id = message_reactions.message_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

CREATE POLICY "Matched users add reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages msg
      JOIN public.matches m ON m.id = msg.match_id
      WHERE msg.id = message_reactions.message_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

CREATE POLICY "Users remove their own reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- Trigger: auto-bump last_active_at on message insert
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_sent_touch_active ON public.messages;
CREATE TRIGGER on_message_sent_touch_active
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_last_active();

-- =========================================
-- RPC: set private notes on a connection you own
-- =========================================
CREATE OR REPLACE FUNCTION public.set_connection_notes(
  in_connection_id UUID,
  in_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT count(*) INTO v_count
  FROM public.connections
  WHERE id = in_connection_id AND (user_a = v_uid OR user_b = v_uid);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'not your connection';
  END IF;
  UPDATE public.connections
  SET notes = in_notes
  WHERE id = in_connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_connection_notes(UUID, TEXT) TO authenticated;

-- =========================================
-- Realtime: add message_reactions to publication
-- =========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;
