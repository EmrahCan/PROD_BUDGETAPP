-- Create cron job for daily onboarding emails at 10:00 AM Turkey time (07:00 UTC)
SELECT cron.schedule(
  'daily-onboarding-emails',
  '0 7 * * *', -- Every day at 07:00 UTC = 10:00 Turkey
  $$
  SELECT net.http_post(
    url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/onboarding-emails',
    body := jsonb_build_object('secret', current_setting('app.settings.cron_auth_secret', true)),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);