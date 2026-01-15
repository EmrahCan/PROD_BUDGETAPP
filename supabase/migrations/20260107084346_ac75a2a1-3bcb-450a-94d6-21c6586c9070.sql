-- Add timezone column to email_preferences
ALTER TABLE public.email_preferences 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Istanbul';

-- Update existing records to have Turkey timezone
UPDATE public.email_preferences 
SET timezone = 'Europe/Istanbul' 
WHERE timezone IS NULL;