-- Create budget_limits table for tracking spending limits
CREATE TABLE IF NOT EXISTS public.budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  alert_threshold NUMERIC DEFAULT 80, -- Alert when 80% of limit is reached
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own limits"
  ON public.budget_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own limits"
  ON public.budget_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limits"
  ON public.budget_limits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own limits"
  ON public.budget_limits FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_budget_limits_updated_at
  BEFORE UPDATE ON public.budget_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check budget and create notification
CREATE OR REPLACE FUNCTION check_budget_limit()
RETURNS TRIGGER AS $$
DECLARE
  limit_record RECORD;
  current_spending NUMERIC;
  spending_percentage NUMERIC;
BEGIN
  -- Get all active budget limits for the user and category
  FOR limit_record IN 
    SELECT * FROM public.budget_limits 
    WHERE user_id = NEW.user_id 
    AND category = NEW.category 
    AND is_active = true
  LOOP
    -- Calculate current month spending for this category
    SELECT COALESCE(SUM(amount), 0) INTO current_spending
    FROM public.transactions
    WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND transaction_type = 'expense'
    AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE);
    
    -- Calculate percentage
    spending_percentage := (current_spending / limit_record.monthly_limit) * 100;
    
    -- Create notification if threshold exceeded and no recent notification exists
    IF spending_percentage >= limit_record.alert_threshold THEN
      -- Check if notification already exists for this month
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = NEW.user_id
        AND notification_type = 'budget_alert'
        AND related_entity_type = 'budget_limit'
        AND related_entity_id = limit_record.id
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      ) THEN
        -- Insert notification
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          notification_type,
          priority,
          related_entity_type,
          related_entity_id
        ) VALUES (
          NEW.user_id,
          'Bütçe Uyarısı: ' || NEW.category,
          'Bu ay ' || NEW.category || ' kategorisinde ' || ROUND(spending_percentage, 0) || '% (' || 
          TO_CHAR(current_spending, 'FM999,999,990.00') || ' ₺/' || 
          TO_CHAR(limit_record.monthly_limit, 'FM999,999,990.00') || ' ₺) harcama yaptınız.',
          'budget_alert',
          CASE 
            WHEN spending_percentage >= 100 THEN 'high'
            WHEN spending_percentage >= limit_record.alert_threshold THEN 'medium'
            ELSE 'low'
          END,
          'budget_limit',
          limit_record.id
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on transactions
CREATE TRIGGER check_budget_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.transaction_type = 'expense')
  EXECUTE FUNCTION check_budget_limit();