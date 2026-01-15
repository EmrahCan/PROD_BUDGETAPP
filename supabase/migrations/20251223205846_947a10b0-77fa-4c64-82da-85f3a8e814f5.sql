-- Create a table for tracking monthly payment status of fixed payments
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fixed_payment_id UUID REFERENCES public.fixed_payments(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate records for same payment in same month
CREATE UNIQUE INDEX idx_payment_records_unique ON public.payment_records(fixed_payment_id, payment_month);

-- Enable Row Level Security
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment records" 
ON public.payment_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment records" 
ON public.payment_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment records" 
ON public.payment_records 
FOR DELETE 
USING (auth.uid() = user_id);