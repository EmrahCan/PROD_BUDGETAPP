-- Add overdraft interest rate column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN overdraft_interest_rate numeric NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.overdraft_interest_rate IS 'Annual interest rate (%) for overdraft usage';