-- Add RLS policy for admins to view all cache entries
CREATE POLICY "Admins can view all cache entries"
ON public.ai_cache
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to delete cache entries
CREATE POLICY "Admins can delete all cache entries"
ON public.ai_cache
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));