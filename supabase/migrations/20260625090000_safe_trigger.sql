-- Recreate notify_nearby_on_signal trigger function to be completely safe
-- and catch exceptions silently to prevent blocking signal insertions.

CREATE OR REPLACE FUNCTION public.notify_nearby_on_signal()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    IF NEW.active = TRUE AND (OLD.active IS NULL OR OLD.active = FALSE) THEN
      -- Check if pg_net is available before calling it
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Capture any errors in log without throwing exception to caller
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
