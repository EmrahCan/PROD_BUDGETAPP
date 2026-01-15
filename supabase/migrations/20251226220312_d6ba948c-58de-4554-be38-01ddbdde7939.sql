-- Create badges definition table
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

-- Create user badges table to track earned badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create family members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- Create family invites table
CREATE TABLE public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Create shared accounts table (which accounts are shared with family)
CREATE TABLE public.shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(account_id, family_id)
);

-- Create push notification preferences table
CREATE TABLE public.push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  payment_reminders BOOLEAN DEFAULT true,
  budget_alerts BOOLEAN DEFAULT true,
  achievement_alerts BOOLEAN DEFAULT true,
  subscription_endpoint TEXT,
  subscription_keys JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Badge definitions are readable by everyone
CREATE POLICY "Anyone can view badge definitions"
ON public.badge_definitions FOR SELECT
USING (true);

-- User badges policies
CREATE POLICY "Users can view own badges"
ON public.user_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own badges"
ON public.user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own badges"
ON public.user_badges FOR UPDATE
USING (auth.uid() = user_id);

-- Family groups policies
CREATE POLICY "Users can view their family groups"
ON public.family_groups FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = id AND user_id = auth.uid())
);

CREATE POLICY "Users can create family groups"
ON public.family_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family creators can update their groups"
ON public.family_groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Family creators can delete their groups"
ON public.family_groups FOR DELETE
USING (auth.uid() = created_by);

-- Family members policies
CREATE POLICY "Family members can view their family"
ON public.family_members FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Family creators can add members"
ON public.family_members FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_groups WHERE id = family_id AND created_by = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Family creators can remove members"
ON public.family_members FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.family_groups WHERE id = family_id AND created_by = auth.uid())
  OR user_id = auth.uid()
);

-- Family invites policies
CREATE POLICY "Users can view invites for their family"
ON public.family_invites FOR SELECT
USING (
  invited_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_invites.family_id AND user_id = auth.uid())
);

CREATE POLICY "Family members can create invites"
ON public.family_invites FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_invites.family_id AND user_id = auth.uid())
);

CREATE POLICY "Invite creators can update invites"
ON public.family_invites FOR UPDATE
USING (invited_by = auth.uid());

CREATE POLICY "Invite creators can delete invites"
ON public.family_invites FOR DELETE
USING (invited_by = auth.uid());

-- Shared accounts policies
CREATE POLICY "Family members can view shared accounts"
ON public.shared_accounts FOR SELECT
USING (
  shared_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = shared_accounts.family_id AND user_id = auth.uid())
);

CREATE POLICY "Account owners can share accounts"
ON public.shared_accounts FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid())
);

CREATE POLICY "Account owners can unshare accounts"
ON public.shared_accounts FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid())
);

-- Push notification preferences policies
CREATE POLICY "Users can view own push preferences"
ON public.push_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push preferences"
ON public.push_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push preferences"
ON public.push_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default badge definitions
INSERT INTO public.badge_definitions (id, name, description, icon, category, requirement_type, requirement_value) VALUES
('first_transaction', 'First Step', 'Record your first transaction', 'footprints', 'beginner', 'transaction_count', 1),
('savings_starter', 'Savings Starter', 'Create your first savings goal', 'piggy-bank', 'savings', 'goal_count', 1),
('budget_master', 'Budget Master', 'Stay within budget for a month', 'shield-check', 'budget', 'budget_months', 1),
('consistent_saver', 'Consistent Saver', 'Save for 3 consecutive months', 'trending-up', 'savings', 'save_streak', 3),
('goal_achiever', 'Goal Achiever', 'Complete a savings goal', 'trophy', 'savings', 'completed_goals', 1),
('debt_free', 'Debt Free', 'Pay off all credit card debt', 'check-circle', 'debt', 'zero_debt', 1),
('money_wise', 'Money Wise', 'Get 10 AI advisor recommendations', 'brain', 'learning', 'ai_recommendations', 10),
('streak_master', 'Streak Master', 'Use the app for 30 consecutive days', 'flame', 'engagement', 'login_streak', 30);