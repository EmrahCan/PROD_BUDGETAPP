-- Add language preference column to email_preferences table
ALTER TABLE public.email_preferences 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'tr';

-- Update existing rows to have default language
UPDATE public.email_preferences 
SET language = 'tr' 
WHERE language IS NULL;