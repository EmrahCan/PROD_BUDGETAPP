-- First, set up the cron_auth_secret in database configuration
-- This allows pg_cron to access it via current_setting

-- Drop and recreate the cron job with direct secret value from vault
-- Since we can't use current_setting properly, let's use a different approach

-- Unschedule existing job
SELECT cron.unschedule('daily-onboarding-emails');

-- Create a helper function that will be called by cron
CREATE OR REPLACE FUNCTION public.trigger_onboarding_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Use net.http_post with the secret from environment
  SELECT net.http_post(
    url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/onboarding-emails',
    body := '{"secret": "' || current_setting('app.cron_auth_secret', true) || '"}',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO result;
  
  RAISE NOTICE 'Onboarding emails triggered: %', result;
END;
$$;

-- Actually, let's use a simpler approach - store the secret in a table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS but allow function access
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- No policies needed - only accessed via SECURITY DEFINER function

-- Create improved function to trigger onboarding emails
CREATE OR REPLACE FUNCTION public.trigger_onboarding_emails_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value text;
  result json;
BEGIN
  -- Get secret from system_settings
  SELECT value INTO secret_value FROM public.system_settings WHERE key = 'cron_auth_secret';
  
  IF secret_value IS NULL THEN
    RAISE NOTICE 'cron_auth_secret not found in system_settings';
    RETURN;
  END IF;
  
  -- Call edge function
  SELECT net.http_post(
    url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/onboarding-emails',
    body := jsonb_build_object('secret', secret_value),
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO result;
  
  RAISE NOTICE 'Onboarding emails triggered: %', result;
END;
$$;

-- Schedule the new cron job for 07:00 UTC (10:00 Turkey time)
SELECT cron.schedule(
  'daily-onboarding-emails',
  '0 7 * * *',
  'SELECT public.trigger_onboarding_emails_v2();'
);