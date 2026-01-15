-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all accounts
CREATE POLICY "Admins can view all accounts"
ON public.accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all credit cards
CREATE POLICY "Admins can view all cards"
ON public.credit_cards
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));