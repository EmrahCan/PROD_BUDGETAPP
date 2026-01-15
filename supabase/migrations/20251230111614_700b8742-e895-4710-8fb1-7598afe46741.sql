-- Create loans table for credit/loan tracking
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('housing', 'personal', 'education')),
  bank_id TEXT,
  bank_name TEXT,
  total_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  interest_rate NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE,
  payment_day INTEGER NOT NULL CHECK (payment_day >= 1 AND payment_day <= 31),
  total_months INTEGER NOT NULL,
  paid_months INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update notifications constraint to include all types including loan types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN (
    'budget_alert', 'negative_balance', 'overdraft_exceeded', 
    'payment_reminder', 'payment_overdue', 'card_payment_reminder', 'card_payment_overdue',
    'installment_reminder', 'installment_overdue', 'fixed_payment_reminder',
    'loan_reminder', 'loan_overdue',
    'badge_earned', 'goal_reached', 'goal_progress', 'system', 'receipt_scanned'
  ));