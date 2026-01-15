-- Create page_views table to track user activity
CREATE TABLE public.page_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    page_path TEXT NOT NULL,
    page_name TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duration_seconds INTEGER DEFAULT 0,
    session_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Admins can view all page views (excluding admin users' views)
CREATE POLICY "Admins can view all non-admin page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') 
    AND NOT public.has_role(page_views.user_id, 'admin')
);

-- Users can insert their own page views
CREATE POLICY "Users can insert their own page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own page views (for duration tracking)
CREATE POLICY "Users can update their own page views"
ON public.page_views
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX idx_page_views_viewed_at ON public.page_views(viewed_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);