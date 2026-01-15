-- Add adaptive TTL columns to ai_cache table
ALTER TABLE public.ai_cache 
ADD COLUMN IF NOT EXISTS base_ttl_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS adjusted_ttl_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS last_hit_at TIMESTAMP WITH TIME ZONE;

-- Create cache settings table for storing adaptive cache configuration
CREATE TABLE IF NOT EXISTS public.cache_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cache_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write cache settings
CREATE POLICY "Admins can read cache settings"
ON public.cache_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cache settings"
ON public.cache_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cache settings"
ON public.cache_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default adaptive cache settings
INSERT INTO public.cache_settings (setting_key, setting_value) 
VALUES (
  'adaptive_cache_config',
  '{
    "enabled": true,
    "min_ttl_hours": 6,
    "max_ttl_hours": 48,
    "hit_rate_threshold_low": 0.2,
    "hit_rate_threshold_high": 0.5,
    "ttl_decrease_factor": 0.8,
    "ttl_increase_factor": 1.3,
    "min_entries_for_analysis": 5
  }'::jsonb
) ON CONFLICT (setting_key) DO NOTHING;

-- Create function to calculate adaptive TTL based on cache hit rate
CREATE OR REPLACE FUNCTION public.calculate_adaptive_ttl(
  p_cache_type TEXT,
  p_user_id UUID,
  p_base_ttl_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
  v_enabled BOOLEAN;
  v_min_ttl INTEGER;
  v_max_ttl INTEGER;
  v_hit_threshold_low FLOAT;
  v_hit_threshold_high FLOAT;
  v_decrease_factor FLOAT;
  v_increase_factor FLOAT;
  v_min_entries INTEGER;
  v_total_entries INTEGER;
  v_total_hits INTEGER;
  v_hit_rate FLOAT;
  v_adjusted_ttl INTEGER;
BEGIN
  -- Get adaptive cache config
  SELECT setting_value INTO v_config
  FROM cache_settings
  WHERE setting_key = 'adaptive_cache_config';
  
  IF v_config IS NULL THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  v_enabled := (v_config->>'enabled')::BOOLEAN;
  IF NOT v_enabled THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  v_min_ttl := (v_config->>'min_ttl_hours')::INTEGER;
  v_max_ttl := (v_config->>'max_ttl_hours')::INTEGER;
  v_hit_threshold_low := (v_config->>'hit_rate_threshold_low')::FLOAT;
  v_hit_threshold_high := (v_config->>'hit_rate_threshold_high')::FLOAT;
  v_decrease_factor := (v_config->>'ttl_decrease_factor')::FLOAT;
  v_increase_factor := (v_config->>'ttl_increase_factor')::FLOAT;
  v_min_entries := (v_config->>'min_entries_for_analysis')::INTEGER;
  
  -- Calculate hit rate for similar cache entries (same type, same user, last 30 days)
  SELECT COUNT(*), COALESCE(SUM(hit_count), 0)
  INTO v_total_entries, v_total_hits
  FROM ai_cache
  WHERE cache_type = p_cache_type
    AND user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  -- Not enough data, return base TTL
  IF v_total_entries < v_min_entries THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  -- Calculate hit rate (average hits per entry)
  v_hit_rate := v_total_hits::FLOAT / v_total_entries::FLOAT;
  
  -- Adjust TTL based on hit rate
  IF v_hit_rate < v_hit_threshold_low THEN
    -- Low hit rate = data changes frequently, decrease TTL
    v_adjusted_ttl := GREATEST(v_min_ttl, (p_base_ttl_hours * v_decrease_factor)::INTEGER);
  ELSIF v_hit_rate > v_hit_threshold_high THEN
    -- High hit rate = data is stable, increase TTL
    v_adjusted_ttl := LEAST(v_max_ttl, (p_base_ttl_hours * v_increase_factor)::INTEGER);
  ELSE
    -- Normal hit rate, keep base TTL
    v_adjusted_ttl := p_base_ttl_hours;
  END IF;
  
  RETURN v_adjusted_ttl;
END;
$$;