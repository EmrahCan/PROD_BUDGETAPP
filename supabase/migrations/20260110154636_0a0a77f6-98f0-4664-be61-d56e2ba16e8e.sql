-- Add event_type column to login_events table to track login/logout events
ALTER TABLE public.login_events 
ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'login';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_login_events_event_type ON public.login_events(event_type);

-- Update existing records to have 'login' as event_type
UPDATE public.login_events SET event_type = 'login' WHERE event_type IS NULL;