
-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================
-- profiles
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '✨',
  vibe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================
-- signals (presence broadcasts)
-- =========================================
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,           -- e.g. coffee, walk, study, drink, talk
  note TEXT,                      -- optional ephemeral context
  location geography(Point, 4326) NOT NULL,
  radius_m INT NOT NULL DEFAULT 800 CHECK (radius_m BETWEEN 100 AND 5000),
  place_label TEXT,               -- soft label like "near Indiranagar"
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 minutes'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX signals_location_gix ON public.signals USING GIST (location);
CREATE INDEX signals_active_idx ON public.signals (active, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Author can see own signal; everyone else reads through the security-definer RPC.
CREATE POLICY "Authors read their own signals"
  ON public.signals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users post their own signals"
  ON public.signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors update their own signals"
  ON public.signals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors delete their own signals"
  ON public.signals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- waves (opt-ins to a signal)
-- =========================================
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(signal_id, from_user)
);
GRANT SELECT, INSERT ON public.waves TO authenticated;
GRANT ALL ON public.waves TO service_role;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;

-- Only the waver sees their own wave (no rejection visibility ever).
CREATE POLICY "Wavers read their own waves"
  ON public.waves FOR SELECT TO authenticated
  USING (auth.uid() = from_user);

-- =========================================
-- matches (mutual reveal)
-- =========================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  CHECK (user_a <> user_b)
);
CREATE INDEX matches_user_a_idx ON public.matches(user_a);
CREATE INDEX matches_user_b_idx ON public.matches(user_b);

GRANT SELECT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matched users read their match"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Allow reading the matched person's profile (cross-profile read).
CREATE POLICY "Read matched user profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.user_a = auth.uid() AND m.user_b = profiles.id)
         OR (m.user_b = auth.uid() AND m.user_a = profiles.id)
    )
  );

-- =========================================
-- messages
-- =========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages(match_id, created_at);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matched users read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
        AND m.expires_at > now()
    )
  );

CREATE POLICY "Matched users send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
        AND m.expires_at > now()
    )
  );

-- =========================================
-- Realtime publication
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =========================================
-- RPC: get nearby active signals (without revealing user_id of others)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_nearby_signals(
  in_lat DOUBLE PRECISION,
  in_lng DOUBLE PRECISION,
  in_search_radius_m INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  intent TEXT,
  note TEXT,
  place_label TEXT,
  distance_m DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_mine BOOLEAN,
  already_waved BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.intent,
    s.note,
    s.place_label,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography) AS distance_m,
    s.expires_at,
    s.created_at,
    (s.user_id = auth.uid()) AS is_mine,
    EXISTS (SELECT 1 FROM public.waves w WHERE w.signal_id = s.id AND w.from_user = auth.uid()) AS already_waved
  FROM public.signals s
  WHERE s.active = TRUE
    AND s.expires_at > now()
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography,
      LEAST(GREATEST(in_search_radius_m, s.radius_m), 5000)
    )
  ORDER BY distance_m ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_signals(DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated;

-- =========================================
-- RPC: wave on a signal → creates a match instantly (mutual by design since author opted in by posting)
-- =========================================
CREATE OR REPLACE FUNCTION public.wave_on_signal(in_signal_id UUID)
RETURNS UUID  -- match_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author UUID;
  v_match_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id INTO v_author FROM public.signals
   WHERE id = in_signal_id AND active = TRUE AND expires_at > now();

  IF v_author IS NULL THEN
    RAISE EXCEPTION 'signal not available';
  END IF;
  IF v_author = v_uid THEN
    RAISE EXCEPTION 'cannot wave on your own signal';
  END IF;

  INSERT INTO public.waves (signal_id, from_user)
  VALUES (in_signal_id, v_uid)
  ON CONFLICT (signal_id, from_user) DO NOTHING;

  -- Check if a match already exists for this pair on this signal
  SELECT id INTO v_match_id FROM public.matches
   WHERE signal_id = in_signal_id
     AND ((user_a = v_uid AND user_b = v_author) OR (user_a = v_author AND user_b = v_uid))
   LIMIT 1;

  IF v_match_id IS NULL THEN
    INSERT INTO public.matches (user_a, user_b, signal_id)
    VALUES (LEAST(v_uid, v_author), GREATEST(v_uid, v_author), in_signal_id)
    RETURNING id INTO v_match_id;
  END IF;

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wave_on_signal(UUID) TO authenticated;

-- =========================================
-- Auto-create profile on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Someone'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '✨')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
