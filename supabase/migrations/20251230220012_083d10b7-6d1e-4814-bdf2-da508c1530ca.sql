-- Create a table for currency and precious metal holdings
CREATE TABLE public.currency_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_type TEXT NOT NULL, -- 'currency' or 'metal'
  asset_code TEXT NOT NULL, -- USD, EUR, XAU (gold), XAG (silver), etc.
  asset_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0, -- purchase price in TRY
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.currency_holdings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own currency holdings"
ON public.currency_holdings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own currency holdings"
ON public.currency_holdings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own currency holdings"
ON public.currency_holdings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own currency holdings"
ON public.currency_holdings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_currency_holdings_updated_at
  BEFORE UPDATE ON public.currency_holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();