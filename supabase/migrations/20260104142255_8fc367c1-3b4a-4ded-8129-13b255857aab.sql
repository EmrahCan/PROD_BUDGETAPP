-- Add policy for users to view their own suspicious activity alerts
CREATE POLICY "Users can view own suspicious alerts" 
ON public.suspicious_activity_alerts 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);