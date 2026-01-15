-- Create login_events table for tracking user logins
CREATE TABLE public.login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  country_code TEXT,
  city TEXT,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT
);

-- Enable RLS
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read login events (via service role in edge function)
-- No direct user access - privacy protection
CREATE POLICY "Service role only access"
ON public.login_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_login_events_user_id ON public.login_events(user_id);
CREATE INDEX idx_login_events_login_at ON public.login_events(login_at DESC);
CREATE INDEX idx_login_events_ip_address ON public.login_events(ip_address);

-- Create suspicious_activity_alerts table
CREATE TABLE public.suspicious_activity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can access suspicious activity alerts
CREATE POLICY "Admins can manage suspicious alerts"
ON public.suspicious_activity_alerts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index
CREATE INDEX idx_suspicious_alerts_user_id ON public.suspicious_activity_alerts(user_id);
CREATE INDEX idx_suspicious_alerts_created_at ON public.suspicious_activity_alerts(created_at DESC);
CREATE INDEX idx_suspicious_alerts_is_resolved ON public.suspicious_activity_alerts(is_resolved);

-- Function to detect suspicious login activity
CREATE OR REPLACE FUNCTION public.check_suspicious_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_different_ip_count INTEGER;
  last_login_record RECORD;
  time_diff_minutes INTEGER;
BEGIN
  -- Get the most recent login for this user (before this one)
  SELECT ip_address, login_at, country_code
  INTO last_login_record
  FROM public.login_events
  WHERE user_id = NEW.user_id
    AND id != NEW.id
  ORDER BY login_at DESC
  LIMIT 1;

  -- Check for different IP in short time (potential account sharing or compromise)
  IF last_login_record IS NOT NULL THEN
    time_diff_minutes := EXTRACT(EPOCH FROM (NEW.login_at - last_login_record.login_at)) / 60;
    
    -- Different IP within 5 minutes
    IF last_login_record.ip_address IS NOT NULL 
       AND NEW.ip_address IS NOT NULL 
       AND last_login_record.ip_address != NEW.ip_address 
       AND time_diff_minutes < 5 THEN
      
      NEW.is_suspicious := true;
      NEW.suspicious_reason := 'Different IP address within 5 minutes';
      
      -- Create alert
      INSERT INTO public.suspicious_activity_alerts (
        user_id, alert_type, severity, description, metadata
      ) VALUES (
        NEW.user_id,
        'rapid_ip_change',
        'high',
        'Kullanıcı 5 dakika içinde farklı IP adresinden giriş yaptı',
        jsonb_build_object(
          'previous_ip', last_login_record.ip_address,
          'new_ip', NEW.ip_address,
          'time_diff_minutes', time_diff_minutes,
          'previous_login', last_login_record.login_at,
          'new_login', NEW.login_at
        )
      );
    END IF;
    
    -- Different country within 1 hour (impossible travel)
    IF last_login_record.country_code IS NOT NULL 
       AND NEW.country_code IS NOT NULL 
       AND last_login_record.country_code != NEW.country_code 
       AND time_diff_minutes < 60 THEN
      
      NEW.is_suspicious := true;
      NEW.suspicious_reason := COALESCE(NEW.suspicious_reason || '; ', '') || 'Different country within 1 hour (impossible travel)';
      
      -- Create alert
      INSERT INTO public.suspicious_activity_alerts (
        user_id, alert_type, severity, description, metadata
      ) VALUES (
        NEW.user_id,
        'impossible_travel',
        'critical',
        'Kullanıcı 1 saat içinde farklı ülkeden giriş yaptı (imkansız seyahat)',
        jsonb_build_object(
          'previous_country', last_login_record.country_code,
          'new_country', NEW.country_code,
          'time_diff_minutes', time_diff_minutes,
          'previous_login', last_login_record.login_at,
          'new_login', NEW.login_at
        )
      );
    END IF;
  END IF;

  -- Check for many different IPs in last 24 hours
  SELECT COUNT(DISTINCT ip_address)
  INTO recent_different_ip_count
  FROM public.login_events
  WHERE user_id = NEW.user_id
    AND login_at > NOW() - INTERVAL '24 hours';

  IF recent_different_ip_count >= 5 THEN
    NEW.is_suspicious := true;
    NEW.suspicious_reason := COALESCE(NEW.suspicious_reason || '; ', '') || 'More than 5 different IPs in 24 hours';
    
    -- Create alert only if not already created today
    IF NOT EXISTS (
      SELECT 1 FROM public.suspicious_activity_alerts
      WHERE user_id = NEW.user_id
        AND alert_type = 'multiple_ips'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO public.suspicious_activity_alerts (
        user_id, alert_type, severity, description, metadata
      ) VALUES (
        NEW.user_id,
        'multiple_ips',
        'medium',
        'Kullanıcı son 24 saatte 5 veya daha fazla farklı IP adresinden giriş yaptı',
        jsonb_build_object(
          'ip_count', recent_different_ip_count
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER check_suspicious_login_trigger
BEFORE INSERT ON public.login_events
FOR EACH ROW
EXECUTE FUNCTION public.check_suspicious_login();