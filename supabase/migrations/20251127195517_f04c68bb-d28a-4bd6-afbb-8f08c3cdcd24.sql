-- Create function to check for negative balance and create notification
CREATE OR REPLACE FUNCTION public.check_negative_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_balance NUMERIC;
BEGIN
  -- Calculate available balance (balance + overdraft_limit)
  available_balance := NEW.balance + COALESCE(NEW.overdraft_limit, 0);
  
  -- Check if balance is negative
  IF NEW.balance < 0 THEN
    -- Check if notification already exists for this account today
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.user_id
      AND notification_type = 'negative_balance'
      AND related_entity_type = 'account'
      AND related_entity_id = NEW.id
      AND created_at >= CURRENT_DATE
    ) THEN
      -- Insert notification for negative balance
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        priority,
        related_entity_type,
        related_entity_id,
        action_url
      ) VALUES (
        NEW.user_id,
        'Negatif Bakiye Uyarısı: ' || NEW.name,
        NEW.name || ' hesabınızın bakiyesi negatife düştü. Mevcut bakiye: ' || 
        TO_CHAR(NEW.balance, 'FM999,999,990.00') || ' ₺' ||
        CASE 
          WHEN NEW.overdraft_limit > 0 THEN 
            '. Kredili mevduat limitiniz: ' || TO_CHAR(NEW.overdraft_limit, 'FM999,999,990.00') || ' ₺'
          ELSE ''
        END,
        'negative_balance',
        CASE 
          WHEN available_balance < 0 THEN 'high'
          WHEN NEW.balance < 0 AND available_balance >= 0 THEN 'medium'
          ELSE 'low'
        END,
        'account',
        NEW.id,
        '/accounts'
      );
    END IF;
  END IF;
  
  -- Check if overdraft limit is exceeded (balance + overdraft < 0)
  IF available_balance < 0 AND NEW.overdraft_limit > 0 THEN
    -- Check if notification already exists for overdraft exceeded today
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.user_id
      AND notification_type = 'overdraft_exceeded'
      AND related_entity_type = 'account'
      AND related_entity_id = NEW.id
      AND created_at >= CURRENT_DATE
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        priority,
        related_entity_type,
        related_entity_id,
        action_url
      ) VALUES (
        NEW.user_id,
        'Kredili Mevduat Limiti Aşıldı: ' || NEW.name,
        NEW.name || ' hesabınızda kredili mevduat limitinizi aştınız! ' ||
        'Limit: ' || TO_CHAR(NEW.overdraft_limit, 'FM999,999,990.00') || ' ₺, ' ||
        'Aşım: ' || TO_CHAR(ABS(available_balance), 'FM999,999,990.00') || ' ₺',
        'overdraft_exceeded',
        'high',
        'account',
        NEW.id,
        '/accounts'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for negative balance check on accounts table
DROP TRIGGER IF EXISTS check_account_negative_balance ON public.accounts;
CREATE TRIGGER check_account_negative_balance
AFTER INSERT OR UPDATE OF balance ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.check_negative_balance();