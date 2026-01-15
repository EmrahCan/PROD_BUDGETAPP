-- Create email analytics table
CREATE TABLE public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_email_analytics_user_email ON public.email_analytics(user_email);
CREATE INDEX idx_email_analytics_email_type ON public.email_analytics(email_type);
CREATE INDEX idx_email_analytics_event_type ON public.email_analytics(event_type);
CREATE INDEX idx_email_analytics_created_at ON public.email_analytics(created_at);

-- Enable RLS
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics (via service role or admin check)
CREATE POLICY "Admins can view email analytics"
ON public.email_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.email_analytics IS 'Tracks email open and click events for analytics';