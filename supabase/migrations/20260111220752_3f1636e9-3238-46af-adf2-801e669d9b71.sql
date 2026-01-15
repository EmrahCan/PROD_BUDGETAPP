-- Create table to track onboarding email progress
CREATE TABLE public.onboarding_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  current_day INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_emails_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for cron jobs)
CREATE POLICY "Service role only" ON public.onboarding_emails
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_onboarding_emails_pending ON public.onboarding_emails (is_completed, current_day, last_sent_at);

-- Add trigger for updated_at
CREATE TRIGGER update_onboarding_emails_updated_at
  BEFORE UPDATE ON public.onboarding_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();