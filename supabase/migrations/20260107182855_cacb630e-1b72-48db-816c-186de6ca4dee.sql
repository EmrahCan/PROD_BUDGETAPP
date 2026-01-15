-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify admins about new user registration
CREATE OR REPLACE FUNCTION public.notify_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  cron_secret TEXT;
  user_email TEXT;
BEGIN
  -- Get configuration from vault or environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  cron_secret := current_setting('app.settings.cron_auth_secret', true);
  
  -- Try to get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Call edge function via pg_net (fire and forget)
  PERFORM extensions.http_post(
    url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/new-user-notification',
    body := json_build_object(
      'secret', cron_secret,
      'userId', NEW.id,
      'userEmail', COALESCE(user_email, ''),
      'userName', COALESCE(NEW.full_name, ''),
      'registeredAt', NEW.created_at
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json'
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RAISE WARNING 'Failed to notify about new user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_new_user_notify_admins ON public.profiles;
CREATE TRIGGER on_new_user_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_registration();