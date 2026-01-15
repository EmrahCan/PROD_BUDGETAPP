-- Add minimum_payment column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN minimum_payment numeric NOT NULL DEFAULT 0;