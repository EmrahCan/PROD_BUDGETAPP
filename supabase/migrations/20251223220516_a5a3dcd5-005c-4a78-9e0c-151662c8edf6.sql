-- Drop existing constraint and recreate with all needed notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'payment_due'::text, 
  'low_balance'::text, 
  'high_spending'::text, 
  'installment_due'::text, 
  'info'::text,
  'negative_balance'::text,
  'receipt_scanned'::text,
  'budget_exceeded'::text,
  'overdraft_exceeded'::text,
  'budget_alert'::text
]));