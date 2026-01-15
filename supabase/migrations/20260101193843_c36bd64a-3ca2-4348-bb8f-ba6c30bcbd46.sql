-- Create receipt_items table for tracking individual products from receipts
CREATE TABLE public.receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC NOT NULL,
  category TEXT,
  brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own receipt items" 
ON public.receipt_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own receipt items" 
ON public.receipt_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt items" 
ON public.receipt_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt items" 
ON public.receipt_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_receipt_items_user_id ON public.receipt_items(user_id);
CREATE INDEX idx_receipt_items_transaction_id ON public.receipt_items(transaction_id);
CREATE INDEX idx_receipt_items_category ON public.receipt_items(category);
CREATE INDEX idx_receipt_items_created_at ON public.receipt_items(created_at);