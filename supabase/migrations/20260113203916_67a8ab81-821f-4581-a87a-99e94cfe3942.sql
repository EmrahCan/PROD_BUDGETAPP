-- Create AI cache table for storing AI responses
CREATE TABLE public.ai_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL, -- 'financial-insights', 'financial-chat', 'receipt-scanner'
  user_id UUID NOT NULL,
  request_hash TEXT NOT NULL, -- Hash of the request parameters
  response_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cache
CREATE POLICY "Users can view their own cache" 
ON public.ai_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache" 
ON public.ai_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache" 
ON public.ai_cache 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache" 
ON public.ai_cache 
FOR DELETE 
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_ai_cache_lookup ON public.ai_cache (user_id, cache_type, cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_cache (expires_at);

-- Function to clean expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ai_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;