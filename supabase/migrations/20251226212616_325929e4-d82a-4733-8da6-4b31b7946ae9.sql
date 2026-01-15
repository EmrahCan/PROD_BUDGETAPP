-- Add preferred_hour column for daily reports timing
ALTER TABLE public.email_preferences 
ADD COLUMN preferred_hour integer DEFAULT 9 CHECK (preferred_hour >= 0 AND preferred_hour <= 23);