-- Create push subscriptions table to store client Web Push subscription details
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own push subscriptions
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a function/trigger to notify when a user goes live
CREATE OR REPLACE FUNCTION public.notify_nearby_on_signal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = TRUE AND (OLD.active IS NULL OR OLD.active = FALSE) THEN
    -- Invoke Edge Function asynchronously using pg_net (if available)
    PERFORM
      net.http_post(
        url := 'https://nqtwslncjxbekupkvazu.functions.supabase.co/push-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(current_setting('request.headers', true)::jsonb->>'authorization', '')
        ),
        body := jsonb_build_object(
          'event', 'new_signal',
          'signal_id', NEW.id,
          'user_id', NEW.user_id,
          'intent', NEW.intent,
          'note', NEW.note,
          'lat', ST_Y(NEW.location::geometry),
          'lng', ST_X(NEW.location::geometry),
          'radius_m', NEW.radius_m
        )::text
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS signal_notify_nearby_trig ON public.signals;
CREATE TRIGGER signal_notify_nearby_trig
  AFTER INSERT OR UPDATE ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_nearby_on_signal();
