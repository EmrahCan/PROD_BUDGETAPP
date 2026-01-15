-- Update check_budget_limit function to also send push notifications
CREATE OR REPLACE FUNCTION public.check_budget_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  limit_record RECORD;
  current_spending NUMERIC;
  spending_percentage NUMERIC;
  request_id BIGINT;
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

        -- Send push notification via edge function
        BEGIN
          SELECT net.http_post(
            url := 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/send-push-notification',
            body := jsonb_build_object(
              'userId', NEW.user_id::text,
              'title', CASE 
                WHEN spending_percentage >= 100 THEN '🚨 Bütçe Aşıldı: ' || NEW.category
                ELSE '⚠️ Bütçe Uyarısı: ' || NEW.category
              END,
              'message', 'Bu ay ' || NEW.category || ' kategorisinde %' || ROUND(spending_percentage, 0) || ' harcama yaptınız.',
              'url', '/dashboard',
              'tag', 'budget-alert-' || limit_record.id::text,
              'priority', CASE WHEN spending_percentage >= 100 THEN 'high' ELSE 'medium' END,
              'notificationType', 'budget_alert'
            ),
            headers := jsonb_build_object(
              'Content-Type', 'application/json'
            )
          ) INTO request_id;
          
          RAISE LOG 'Budget alert push notification request sent, id: %', request_id;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Failed to send budget alert push notification: %', SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;