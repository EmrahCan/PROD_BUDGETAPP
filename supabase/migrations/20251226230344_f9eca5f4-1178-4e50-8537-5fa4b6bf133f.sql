-- Add preferred_day column to email_preferences table
-- For weekly: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: Monday = 1)
-- For monthly: 1-28 (day of month, default: 1)
ALTER TABLE public.email_preferences 
ADD COLUMN IF NOT EXISTS preferred_day INTEGER DEFAULT 1 CHECK (preferred_day >= 0 AND preferred_day <= 28);