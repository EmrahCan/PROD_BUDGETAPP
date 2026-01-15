-- =============================================
-- FinansKoç / BudgetApp Database Schema Export
-- Generated for Azure PostgreSQL Migration
-- Date: 2025-01-15
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- =============================================
-- TABLES
-- =============================================

-- Profiles (User information)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Accounts (Bank accounts)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    iban TEXT,
    account_type TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'TRY',
    overdraft_limit NUMERIC NOT NULL DEFAULT 0,
    overdraft_interest_rate NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credit Cards
CREATE TABLE public.credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    last_four_digits TEXT NOT NULL,
    card_limit NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'TRY',
    due_date INTEGER NOT NULL,
    minimum_payment NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID REFERENCES public.accounts(id),
    card_id UUID REFERENCES public.credit_cards(id),
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'TRY',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fixed Payments (Recurring payments)
CREATE TABLE public.fixed_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    payment_day INTEGER NOT NULL,
    account_id UUID REFERENCES public.accounts(id),
    card_id UUID REFERENCES public.credit_cards(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Records (Fixed payment history)
CREATE TABLE public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    fixed_payment_id UUID REFERENCES public.fixed_payments(id),
    payment_month DATE NOT NULL,
    amount NUMERIC NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Installments
CREATE TABLE public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    monthly_amount NUMERIC NOT NULL,
    total_months INTEGER NOT NULL,
    paid_months INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    category TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    card_id UUID REFERENCES public.credit_cards(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Loans
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    loan_type TEXT NOT NULL,
    bank_id TEXT,
    bank_name TEXT,
    total_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    monthly_payment NUMERIC NOT NULL,
    interest_rate NUMERIC,
    currency TEXT NOT NULL DEFAULT 'TRY',
    start_date DATE NOT NULL,
    end_date DATE,
    payment_day INTEGER NOT NULL,
    total_months INTEGER NOT NULL,
    paid_months INTEGER NOT NULL DEFAULT 0,
    account_id UUID REFERENCES public.accounts(id),
    card_id UUID REFERENCES public.credit_cards(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Budget Limits
CREATE TABLE public.budget_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category TEXT NOT NULL,
    monthly_limit NUMERIC NOT NULL,
    alert_threshold NUMERIC DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Savings Goals
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    deadline DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    priority VARCHAR DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    related_id UUID,
    related_entity_type VARCHAR,
    related_entity_id UUID,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crypto Holdings
CREATE TABLE public.crypto_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    purchase_price NUMERIC NOT NULL DEFAULT 0,
    purchase_currency TEXT NOT NULL DEFAULT 'USD',
    exchange TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crypto Price Alerts
CREATE TABLE public.crypto_price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    target_price NUMERIC NOT NULL,
    direction TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Currency Holdings (Forex & Gold)
CREATE TABLE public.currency_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_type TEXT NOT NULL,
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    purchase_price NUMERIC NOT NULL DEFAULT 0,
    purchase_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receipt Items (OCR scanned items)
CREATE TABLE public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC,
    total_price NUMERIC NOT NULL,
    transaction_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family Groups
CREATE TABLE public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Family Members
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.family_groups(id),
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Family Invites
CREATE TABLE public.family_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.family_groups(id),
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Shared Accounts
CREATE TABLE public.shared_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    family_id UUID NOT NULL REFERENCES public.family_groups(id),
    shared_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Badge Definitions
CREATE TABLE public.badge_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Badges
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
    progress INTEGER DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Push Notification Preferences
CREATE TABLE public.push_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    enabled BOOLEAN DEFAULT false,
    payment_reminders BOOLEAN DEFAULT true,
    budget_alerts BOOLEAN DEFAULT true,
    achievement_alerts BOOLEAN DEFAULT true,
    subscription_endpoint TEXT,
    subscription_keys JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email Preferences
CREATE TABLE public.email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'none',
    preferred_hour INTEGER DEFAULT 9,
    preferred_minute INTEGER DEFAULT 0,
    preferred_day INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'Europe/Istanbul',
    language TEXT DEFAULT 'tr',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Onboarding Emails
CREATE TABLE public.onboarding_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    current_day INTEGER NOT NULL DEFAULT 1,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Analytics
CREATE TABLE public.email_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT NOT NULL,
    email_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    link_url TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Login Events (Security)
CREATE TABLE public.login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'login',
    ip_address TEXT,
    user_agent TEXT,
    country_code TEXT,
    city TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_reason TEXT,
    login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suspicious Activity Alerts
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

-- Page Views (Analytics)
CREATE TABLE public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    page_name TEXT NOT NULL,
    page_path TEXT NOT NULL,
    session_id UUID,
    duration_seconds INTEGER DEFAULT 0,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Preferences
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Cache
CREATE TABLE public.ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cache_key TEXT NOT NULL,
    cache_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_data JSONB NOT NULL,
    base_ttl_hours INTEGER DEFAULT 24,
    adjusted_ttl_hours INTEGER DEFAULT 24,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cache Settings
CREATE TABLE public.cache_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System Settings
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX idx_fixed_payments_user_id ON public.fixed_payments(user_id);
CREATE INDEX idx_installments_user_id ON public.installments(user_id);
CREATE INDEX idx_loans_user_id ON public.loans(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX idx_login_events_user_id ON public.login_events(user_id);
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX idx_ai_cache_user_id ON public.ai_cache(user_id);
CREATE INDEX idx_ai_cache_expires_at ON public.ai_cache(expires_at);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Has Role Function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Is Family Member
CREATE OR REPLACE FUNCTION public.is_family_member(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id AND user_id = _user_id
  )
$$;

-- Is Family Owner
CREATE OR REPLACE FUNCTION public.is_family_owner(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_groups
    WHERE id = _family_id AND created_by = _user_id
  )
$$;

-- Has Valid Family Invite
CREATE OR REPLACE FUNCTION public.has_valid_family_invite(_family_id UUID, _email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_invites
    WHERE family_id = _family_id
      AND lower(invited_email) = lower(_email)
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Update Updated At Column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Cleanup Expired AI Cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.ai_cache WHERE expires_at < now();
END;
$$;

-- Normalize Payment Records Month
CREATE OR REPLACE FUNCTION public.normalize_payment_records_payment_month()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_month IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.payment_month := date_trunc('month', (NEW.payment_month::timestamp + interval '1 day'))::date;
  RETURN NEW;
END;
$$;

-- Check Budget Limit (Trigger Function)
CREATE OR REPLACE FUNCTION public.check_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  limit_record RECORD;
  current_spending NUMERIC;
  spending_percentage NUMERIC;
BEGIN
  FOR limit_record IN 
    SELECT * FROM public.budget_limits 
    WHERE user_id = NEW.user_id 
    AND category = NEW.category 
    AND is_active = true
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO current_spending
    FROM public.transactions
    WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND transaction_type = 'expense'
    AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE);
    
    spending_percentage := (current_spending / limit_record.monthly_limit) * 100;
    
    IF spending_percentage >= limit_record.alert_threshold THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = NEW.user_id
        AND notification_type = 'budget_alert'
        AND related_entity_type = 'budget_limit'
        AND related_entity_id = limit_record.id
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      ) THEN
        INSERT INTO public.notifications (
          user_id, title, message, notification_type, priority,
          related_entity_type, related_entity_id
        ) VALUES (
          NEW.user_id,
          'Bütçe Uyarısı: ' || NEW.category,
          'Bu ay ' || NEW.category || ' kategorisinde ' || ROUND(spending_percentage, 0) || '% harcama yaptınız.',
          'budget_alert',
          CASE WHEN spending_percentage >= 100 THEN 'high' ELSE 'medium' END,
          'budget_limit',
          limit_record.id
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Check Negative Balance (Trigger Function)
CREATE OR REPLACE FUNCTION public.check_negative_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  available_balance NUMERIC;
BEGIN
  available_balance := NEW.balance + COALESCE(NEW.overdraft_limit, 0);
  
  IF NEW.balance < 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.user_id
      AND notification_type = 'negative_balance'
      AND related_entity_type = 'account'
      AND related_entity_id = NEW.id
      AND created_at >= CURRENT_DATE
    ) THEN
      INSERT INTO public.notifications (
        user_id, title, message, notification_type, priority,
        related_entity_type, related_entity_id, action_url
      ) VALUES (
        NEW.user_id,
        'Negatif Bakiye Uyarısı: ' || NEW.name,
        NEW.name || ' hesabınızın bakiyesi negatife düştü.',
        'negative_balance',
        CASE WHEN available_balance < 0 THEN 'high' ELSE 'medium' END,
        'account',
        NEW.id,
        '/accounts'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Check Suspicious Login (Trigger Function)
CREATE OR REPLACE FUNCTION public.check_suspicious_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_different_ip_count INTEGER;
  last_login_record RECORD;
  time_diff_minutes INTEGER;
BEGIN
  SELECT ip_address, login_at, country_code
  INTO last_login_record
  FROM public.login_events
  WHERE user_id = NEW.user_id AND id != NEW.id
  ORDER BY login_at DESC
  LIMIT 1;

  IF last_login_record IS NOT NULL THEN
    time_diff_minutes := EXTRACT(EPOCH FROM (NEW.login_at - last_login_record.login_at)) / 60;
    
    IF last_login_record.ip_address IS NOT NULL 
       AND NEW.ip_address IS NOT NULL 
       AND last_login_record.ip_address != NEW.ip_address 
       AND time_diff_minutes < 5 THEN
      NEW.is_suspicious := true;
      NEW.suspicious_reason := 'Different IP address within 5 minutes';
      
      INSERT INTO public.suspicious_activity_alerts (
        user_id, alert_type, severity, description, metadata
      ) VALUES (
        NEW.user_id, 'rapid_ip_change', 'high',
        'User logged in from different IP within 5 minutes',
        jsonb_build_object('previous_ip', last_login_record.ip_address, 'new_ip', NEW.ip_address)
      );
    END IF;
    
    IF last_login_record.country_code IS NOT NULL 
       AND NEW.country_code IS NOT NULL 
       AND last_login_record.country_code != NEW.country_code 
       AND time_diff_minutes < 60 THEN
      NEW.is_suspicious := true;
      NEW.suspicious_reason := 'Impossible travel detected';
      
      INSERT INTO public.suspicious_activity_alerts (
        user_id, alert_type, severity, description, metadata
      ) VALUES (
        NEW.user_id, 'impossible_travel', 'critical',
        'User logged in from different country within 1 hour',
        jsonb_build_object('previous_country', last_login_record.country_code, 'new_country', NEW.country_code)
      );
    END IF;
  END IF;

  SELECT COUNT(DISTINCT ip_address) INTO recent_different_ip_count
  FROM public.login_events
  WHERE user_id = NEW.user_id AND login_at > NOW() - INTERVAL '24 hours';

  IF recent_different_ip_count >= 5 THEN
    NEW.is_suspicious := true;
    NEW.suspicious_reason := 'More than 5 different IPs in 24 hours';
  END IF;

  RETURN NEW;
END;
$$;

-- Calculate Adaptive TTL
CREATE OR REPLACE FUNCTION public.calculate_adaptive_ttl(
  p_cache_type TEXT,
  p_user_id UUID,
  p_base_ttl_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config JSONB;
  v_enabled BOOLEAN;
  v_total_entries INTEGER;
  v_total_hits INTEGER;
  v_hit_rate FLOAT;
BEGIN
  SELECT setting_value INTO v_config
  FROM cache_settings
  WHERE setting_key = 'adaptive_cache_config';
  
  IF v_config IS NULL THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  v_enabled := (v_config->>'enabled')::BOOLEAN;
  IF NOT v_enabled THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  SELECT COUNT(*), COALESCE(SUM(hit_count), 0)
  INTO v_total_entries, v_total_hits
  FROM ai_cache
  WHERE cache_type = p_cache_type
    AND user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  IF v_total_entries < 5 THEN
    RETURN p_base_ttl_hours;
  END IF;
  
  v_hit_rate := v_total_hits::FLOAT / v_total_entries::FLOAT;
  
  IF v_hit_rate < 0.3 THEN
    RETURN GREATEST(6, (p_base_ttl_hours * 0.5)::INTEGER);
  ELSIF v_hit_rate > 2.0 THEN
    RETURN LEAST(168, (p_base_ttl_hours * 1.5)::INTEGER);
  ELSE
    RETURN p_base_ttl_hours;
  END IF;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated At Triggers
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fixed_payments_updated_at
  BEFORE UPDATE ON public.fixed_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business Logic Triggers
CREATE TRIGGER check_budget_limit_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_budget_limit();

CREATE TRIGGER check_negative_balance_trigger
  AFTER UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.check_negative_balance();

CREATE TRIGGER check_suspicious_login_trigger
  BEFORE INSERT ON public.login_events
  FOR EACH ROW EXECUTE FUNCTION public.check_suspicious_login();

CREATE TRIGGER normalize_payment_month_trigger
  BEFORE INSERT OR UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.normalize_payment_records_payment_month();

-- =============================================
-- INITIAL DATA (Badge Definitions)
-- =============================================
INSERT INTO public.badge_definitions (id, name, description, icon, category, requirement_type, requirement_value) VALUES
('first_transaction', 'İlk Adım', 'İlk işleminizi gerçekleştirdiniz', '🎯', 'transactions', 'transaction_count', 1),
('transaction_10', 'Aktif Kullanıcı', '10 işlem gerçekleştirdiniz', '📊', 'transactions', 'transaction_count', 10),
('transaction_50', 'Finans Ustası', '50 işlem gerçekleştirdiniz', '🏆', 'transactions', 'transaction_count', 50),
('transaction_100', 'Finans Efsanesi', '100 işlem gerçekleştirdiniz', '👑', 'transactions', 'transaction_count', 100),
('first_budget', 'Bütçe Planlayıcı', 'İlk bütçe limitinizi belirlediniz', '💰', 'budget', 'budget_count', 1),
('budget_keeper', 'Bütçe Koruyucu', 'Bir ay boyunca bütçenizi aşmadınız', '🛡️', 'budget', 'budget_streak', 1),
('first_goal', 'Hedef Belirleyici', 'İlk tasarruf hedefinizi oluşturdunuz', '🎯', 'savings', 'goal_count', 1),
('goal_achiever', 'Hedef Avcısı', 'Bir tasarruf hedefinizi tamamladınız', '✅', 'savings', 'goal_completed', 1),
('receipt_scanner', 'Fiş Dedektifi', 'İlk fişinizi taradınız', '📸', 'receipts', 'receipt_count', 1),
('receipt_master', 'Fiş Ustası', '10 fiş taradınız', '🔍', 'receipts', 'receipt_count', 10)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- NOTES FOR AZURE MIGRATION
-- =============================================
-- 1. Replace UUID functions if using Azure SQL instead of PostgreSQL
-- 2. Configure authentication separately (Azure AD, custom auth, etc.)
-- 3. Set up Row Level Security policies according to your auth system
-- 4. Configure scheduled jobs using Azure Functions or Logic Apps
-- 5. Set up storage for receipt images (Azure Blob Storage)
-- 6. Configure email sending (Azure Communication Services / SendGrid)
