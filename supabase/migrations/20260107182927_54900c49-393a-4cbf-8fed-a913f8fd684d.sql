-- Update function to use correct pg_net syntax
CREATE OR REPLACE FUNCTION public.notify_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  request_id BIGINT;
BEGIN
  -- Try to get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Call edge function via pg_net (fire and forget)
  SELECT net.http_post(
    url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/new-user-notification',
    body := jsonb_build_object(
      'secret', current_setting('app.settings.cron_auth_secret', true),
      'userId', NEW.id::text,
      'userEmail', COALESCE(user_email, ''),
      'userName', COALESCE(NEW.full_name, ''),
      'registeredAt', NEW.created_at::text
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) INTO request_id;

  RAISE LOG 'New user notification request sent, id: %', request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RAISE WARNING 'Failed to notify about new user: %', SQLERRM;
    RETURN NEW;
END;
$$;