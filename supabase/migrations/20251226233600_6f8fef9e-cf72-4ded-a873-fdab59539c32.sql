-- Create crypto_holdings table for tracking cryptocurrency investments
CREATE TABLE public.crypto_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL, -- e.g., BTC, ETH, SOL
  name TEXT NOT NULL, -- e.g., Bitcoin, Ethereum
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0, -- Average purchase price in USD
  purchase_currency TEXT NOT NULL DEFAULT 'USD',
  exchange TEXT, -- e.g., Binance, Paribu, Coinbase
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view own crypto holdings"
ON public.crypto_holdings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own crypto holdings"
ON public.crypto_holdings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crypto holdings"
ON public.crypto_holdings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crypto holdings"
ON public.crypto_holdings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crypto_holdings_updated_at
BEFORE UPDATE ON public.crypto_holdings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();