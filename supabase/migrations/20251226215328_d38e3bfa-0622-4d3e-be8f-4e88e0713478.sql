-- Add preferred_minute column to email_preferences table
ALTER TABLE public.email_preferences 
ADD COLUMN preferred_minute integer DEFAULT 0;