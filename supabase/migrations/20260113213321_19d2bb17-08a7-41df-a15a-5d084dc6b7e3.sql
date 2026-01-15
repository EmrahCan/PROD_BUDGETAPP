-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role only" ON public.onboarding_emails;

-- Create proper service_role only policy
CREATE POLICY "Service role only access"
  ON public.onboarding_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add admin read access for dashboard analytics
CREATE POLICY "Admins can view onboarding emails"
  ON public.onboarding_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));