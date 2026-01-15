-- Add overdraft_limit column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN overdraft_limit numeric NOT NULL DEFAULT 0;

-- Add a comment to explain the column
COMMENT ON COLUMN public.accounts.overdraft_limit IS 'Kredili mevduat limiti - hesabın ne kadar negatife düşebileceğini belirler';